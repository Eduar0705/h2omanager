/**
 * Usuarios (empleados del sistema) — API Laravel /api/v1/usuario
 * Requiere rol_id y sucursal_id. No hay endpoint público de roles: se usa catálogo alineado al seed de la API.
 */

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;

const USUARIO_PATH = USE_VITE_PROXY ? '/api/v1/usuario' : `${PROD_API_ORIGIN}/api/v1/usuario`;
const SUCURSAL_PATH = USE_VITE_PROXY ? '/api/v1/sucursal' : `${PROD_API_ORIGIN}/api/v1/sucursal`;

/** Debe coincidir con la tabla `rol` en la base de datos de api-h2o-manager */
export const ROL_OPCIONES = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Gerente de Sucursal' },
    { id: 3, nombre: 'Cajero' },
    { id: 4, nombre: 'Operario de Planta' },
];

function resolvePaginationUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
        if (USE_VITE_PROXY) {
            try {
                const u = new URL(url);
                if (u.pathname.startsWith('/api')) {
                    return `${u.pathname}${u.search}`;
                }
            } catch {
                /* ignore */
            }
        }
        return url;
    }
    if (url.startsWith('/')) {
        return BASE_URL ? `${BASE_URL}${url}` : url;
    }
    if (BASE_URL) {
        return `${BASE_URL}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    }
    return `/${url}`.replace(/\/+/g, '/');
}

function requireApiConfig() {
    if (!USE_VITE_PROXY && !PROD_API_ORIGIN) {
        throw new Error('Configura VITE_API_URL en .env para el build de producción.');
    }
}

export const mapUsuarioApiToUi = (row) => {
    if (row == null || typeof row !== 'object') {
        throw new Error('Respuesta de usuario inválida desde la API.');
    }
    return {
        id: row.id,
        name: row.nombre ?? '',
        email: row.email ?? '',
        cedula: row.cedula ?? '',
        role: row.rol ?? '',
        sucursal: row.sucursal ?? '',
        phone: '',
        status: row.deletedAt ? 'inactive' : 'active',
    };
};

function mapStoreBody(form) {
    return {
        nombre: form.name,
        email: form.email,
        password: form.password,
        cedula: form.cedula,
        rol_id: Number(form.rolId),
        sucursal_id: Number(form.sucursalId),
    };
}

function mapPatchBody(form) {
    const p = {};
    if (form.name != null && form.name !== '') p.nombre = form.name;
    if (form.email != null && form.email !== '') p.email = form.email;
    if (form.cedula != null && form.cedula !== '') p.cedula = form.cedula;
    if (form.rolId != null && form.rolId !== '') p.rol_id = Number(form.rolId);
    if (form.sucursalId != null && form.sucursalId !== '') p.sucursal_id = Number(form.sucursalId);
    if (form.password && String(form.password).trim() !== '') p.password = form.password;
    return p;
}

const defaultHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
};

async function parseJsonSafe(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}

async function handleResponse(response) {
    const body = await parseJsonSafe(response);
    if (response.ok) return body;
    const msg =
        body?.message ||
        (body?.errors && Object.values(body.errors).flat().join(' ')) ||
        `Error HTTP ${response.status}`;
    throw new Error(msg);
}

async function fetchWithNetworkHint(url, init = {}) {
    try {
        return await fetch(url, init);
    } catch (e) {
        const hint =
            e?.message?.includes('Failed to fetch') || e?.name === 'TypeError'
                ? USE_VITE_PROXY
                    ? ' Reinicia `npm run dev`, revisa el proxy en vite.config y que Laragon esté en marcha.'
                    : ' Comprueba VITE_API_URL, que el servidor API esté en marcha y CORS.'
                : '';
        throw new Error(`No se pudo conectar con la API.${hint} (${e?.message || e})`);
    }
}

async function apiGet(url) {
    const response = await fetchWithNetworkHint(url, { headers: { Accept: 'application/json' } });
    return handleResponse(response);
}

async function fetchAllPages(basePathWithQuery) {
    const rows = [];
    const seen = new Set();
    let nextUrl = resolvePaginationUrl(basePathWithQuery);
    let guard = 0;
    const maxPages = 500;

    while (nextUrl && guard < maxPages) {
        if (seen.has(nextUrl)) break;
        seen.add(nextUrl);
        const json = await apiGet(nextUrl);
        const chunk = Array.isArray(json.data) ? json.data : [];
        rows.push(...chunk);
        nextUrl = resolvePaginationUrl(json.links?.next);
        guard += 1;
    }
    return rows;
}

export const getUsuarios = async () => {
    requireApiConfig();
    const raw = await fetchAllPages(`${USUARIO_PATH}?page=1`);
    return raw.map(mapUsuarioApiToUi);
};

export const getSucursales = async () => {
    requireApiConfig();
    const raw = await fetchAllPages(`${SUCURSAL_PATH}?page=1`);
    return raw.map((s) => ({ id: s.id, nombre: s.nombre ?? '' }));
};

export const createUsuario = async (form) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(USUARIO_PATH, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(mapStoreBody(form)),
    });
    const body = await handleResponse(response);
    return mapUsuarioApiToUi(body.data ?? body);
};

export const updateUsuario = async (id, form) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${USUARIO_PATH}/${id}`, {
        method: 'PATCH',
        headers: defaultHeaders,
        body: JSON.stringify(mapPatchBody(form)),
    });
    await handleResponse(response);
    const fresh = await apiGet(`${USUARIO_PATH}/${id}`);
    return mapUsuarioApiToUi(fresh.data ?? fresh);
};

export const deleteUsuario = async (id) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${USUARIO_PATH}/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
    });
    await handleResponse(response);
    return true;
};
