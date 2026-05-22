/**
 * Autenticación — API Laravel /api/v1/login, /logout, /me (Sanctum)
 */

const STORAGE_KEY = 'h2o_auth';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;

const LOGIN_PATH = USE_VITE_PROXY ? '/api/v1/login' : `${PROD_API_ORIGIN}/api/v1/login`;
const LOGOUT_PATH = USE_VITE_PROXY ? '/api/v1/logout' : `${PROD_API_ORIGIN}/api/v1/logout`;
const ME_PATH = USE_VITE_PROXY ? '/api/v1/me' : `${PROD_API_ORIGIN}/api/v1/me`;

function requireApiConfig() {
    if (!USE_VITE_PROXY && !PROD_API_ORIGIN) {
        throw new Error('Configura VITE_API_URL en .env para el build de producción.');
    }
}

/** Cajero y operario usan menú restringido (role 2 en la UI). */
export function mapRolIdToUiRole(rolId) {
    const id = Number(rolId);
    if (id === 3 || id === 4) return 2;
    return 1;
}

function mapApiUserToSession(apiUser) {
    return {
        id: apiUser.id,
        name: apiUser.nombre,
        email: apiUser.email,
        cedula: apiUser.cedula,
        rolId: apiUser.rolId,
        rol: apiUser.rol,
        sucursalId: apiUser.sucursalId,
        sucursal: apiUser.sucursal,
        role: mapRolIdToUiRole(apiUser.rolId),
    };
}

export function getStoredAuth() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.token || !parsed?.user) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function getAuthToken() {
    return getStoredAuth()?.token ?? null;
}

export function getAuthHeaders(extra = {}) {
    const token = getAuthToken();
    const headers = { Accept: 'application/json', ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

function saveAuth(token, user) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token, user: mapApiUserToSession(user) })
    );
}

export function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
}

async function handleResponse(response) {
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        /* ignore */
    }
    if (!response.ok) {
        const msg =
            data?.message ||
            (data?.errors && Object.values(data.errors).flat().join(' ')) ||
            `Error del servidor (${response.status})`;
        throw new Error(msg);
    }
    return data;
}

async function fetchWithNetworkHint(url, init = {}) {
    try {
        return await fetch(url, init);
    } catch (e) {
        const hint =
            e?.message?.includes('Failed to fetch') || e?.name === 'TypeError'
                ? USE_VITE_PROXY
                    ? ' No se pudo conectar con la API. ¿Está Laragon/Apache activo y la API en api-h2o-manager.test?'
                    : ' Comprueba VITE_API_URL, que el servidor API esté en marcha y CORS.'
                : '';
        throw new Error((e?.message || 'Error de red') + hint);
    }
}

export async function login(email, password) {
    requireApiConfig();
    const response = await fetchWithNetworkHint(LOGIN_PATH, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    saveAuth(data.token, data.user);
    return getStoredAuth();
}

export async function logout() {
    const token = getAuthToken();
    if (token) {
        try {
            await fetchWithNetworkHint(LOGOUT_PATH, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
        } catch {
            /* cerrar sesión local aunque falle la API */
        }
    }
    clearAuth();
}

export async function fetchCurrentUser() {
    requireApiConfig();
    const token = getAuthToken();
    if (!token) return null;

    const response = await fetchWithNetworkHint(ME_PATH, {
        headers: getAuthHeaders(),
    });

    if (response.status === 401) {
        clearAuth();
        return null;
    }

    const data = await handleResponse(response);
    const sessionUser = mapApiUserToSession(data.user);
    const stored = getStoredAuth();
    if (stored) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ token: stored.token, user: sessionUser })
        );
    }
    return sessionUser;
}

export function isAuthenticated() {
    return Boolean(getAuthToken());
}
