/**
 * Servicios de Configuración - H2OManager
 * Preparado para conexión con API externa con fallback en LocalStorage
 */

import * as usuarioService from './usuarios.service';

const BASE_URL = import.meta.env.VITE_API_URL || ''; // URL base para la API futura
const USE_API = false; // Toggle para activar/desactivar conexión real
const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;
const TARIFA_PATH = USE_VITE_PROXY ? '/api/v1/tarifaRecarga' : `${PROD_API_ORIGIN}/api/v1/tarifaRecarga`;

// Claves para LocalStorage (Fallback)
const KEYS = {
    GENERAL: 'h2o_config_general',
    CURRENCY: 'h2o_config_currency',
    PRICING: 'h2o_config_pricing',
    USERS: 'h2o_config_users'
};

/**
 * Helper para peticiones API con fallback a LocalStorage
 */
const request = async (key, method = 'GET', body = null) => {
    // Simulación de delay de red
    await new Promise(resolve => setTimeout(resolve, 500));

    if (USE_API && BASE_URL) {
        try {
            const response = await fetch(`${BASE_URL}/config/${key}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : null
            });
            if (!response.ok) throw new Error('Error en la petición API');
            return await response.json();
        } catch (error) {
            console.error(`API Error (${key}):`, error);
            // Fallback a LocalStorage en caso de error de red
        }
    }

    // Lógica LocalStorage (Fallback)
    if (method === 'GET') {
        const data = localStorage.getItem(KEYS[key.toUpperCase()]);
        return data ? JSON.parse(data) : null;
    } else {
        localStorage.setItem(KEYS[key.toUpperCase()], JSON.stringify(body));
        return true;
    }
};

// --- Configuración General ---
export const getGeneralConfig = async () => {
    const data = await request('general');
    return data || {
        name: 'H2OManager',
        rif: '',
        address: '',
        phone: '',
        email: ''
    };
};

export const saveGeneralConfig = async (config) => {
    return await request('general', 'POST', config);
};

// --- Configuración de Moneda ---
export const getCurrencyConfig = async () => {
    const data = await request('currency');
    return data || {
        currency: 'USD',
        exchangeRate: 54.50,
        iva: 16
    };
};

export const saveCurrencyConfig = async (config) => {
    return await request('currency', 'POST', config);
};

// --- Configuración de Precios y Botellones ---
export const getPricingConfig = async () => {
    const data = await request('pricing');
    return data || {
        waterPrice: 0.5,
        deliveryPrice: 1.5,
        bottles: [
            { id: 1, size: 20, price: 5.0 },
            { id: 2, size: 10, price: 3.0 }
        ]
    };
};

export const savePricingConfig = async (config) => {
    return await request('pricing', 'POST', config);
};

function requireApiConfig() {
    if (!USE_VITE_PROXY && !PROD_API_ORIGIN) {
        throw new Error('Configura VITE_API_URL en .env para el build de producción.');
    }
}

function resolvePaginationUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
        if (USE_VITE_PROXY) {
            try {
                const u = new URL(url);
                if (u.pathname.startsWith('/api')) return `${u.pathname}${u.search}`;
            } catch {
                /* ignore */
            }
        }
        return url;
    }
    if (url.startsWith('/')) return API_BASE ? `${API_BASE}${url}` : url;
    if (API_BASE) return `${API_BASE}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    return `/${url}`.replace(/\/+/g, '/');
}

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

async function fetchAllTarifas() {
    const rows = [];
    let nextUrl = resolvePaginationUrl(`${TARIFA_PATH}?page=1`);
    const seen = new Set();
    let guard = 0;
    while (nextUrl && guard < 500) {
        if (seen.has(nextUrl)) break;
        seen.add(nextUrl);
        const json = await fetchWithNetworkHint(nextUrl, { headers: { Accept: 'application/json' } }).then(handleResponse);
        rows.push(...(Array.isArray(json?.data) ? json.data : []));
        nextUrl = resolvePaginationUrl(json?.links?.next);
        guard += 1;
    }
    return rows;
}

const defaultHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' };

export const getRecargaTarifas = async () => {
    requireApiConfig();
    const rows = await fetchAllTarifas();
    const uniqueById = new Map();
    rows.forEach((r) => {
        const id = Number(r.id);
        if (!Number.isFinite(id)) return;
        // Si llega repetido desde API/paginación, conservamos una sola entrada.
        if (!uniqueById.has(id)) uniqueById.set(id, r);
    });
    const normalized = Array.from(uniqueById.values()).map((r) => ({
        id: Number(r.id),
        tamanoId: Number(r.tamanoId),
        tamanoNombre: r.tamanoNombre || `Tamaño ${r.tamanoId}`,
        precio: Number(r.precio || 0),
        sucursalId: r.sucursalId == null ? null : Number(r.sucursalId),
        sucursalNombre: r.sucursalNombre || 'Global',
        creadoPorId: Number(r.creadoPorId || 0),
        creadoPor: r.creadoPor || 'N/A',
    }));

    // Deduplicación de negocio: una tarifa vigente por (tamanoId, sucursalId).
    // Si hay varias filas históricas/duplicadas, nos quedamos con la de mayor id.
    const uniqueByBusinessKey = new Map();
    normalized.forEach((t) => {
        const key = `${t.tamanoId}::${t.sucursalId ?? 'global'}`;
        const prev = uniqueByBusinessKey.get(key);
        if (!prev || Number(t.id) > Number(prev.id)) {
            uniqueByBusinessKey.set(key, t);
        }
    });

    return Array.from(uniqueByBusinessKey.values());
};

export const createRecargaTarifa = async (payload) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(TARIFA_PATH, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

export const updateRecargaTarifa = async (id, payload) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${TARIFA_PATH}/${id}`, {
        method: 'PATCH',
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

export const deleteRecargaTarifa = async (id) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${TARIFA_PATH}/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
    });
    await handleResponse(response);
    return true;
};

// --- Gestión de Usuarios (API real) ---
export const getUsers = async () => {
    const list = await usuarioService.getUsuarios();
    return list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
    }));
};

/** Obsoleto: los usuarios se crean/eliminan vía API (`createUsuario` / `deleteUsuario`). */
export const saveUsers = async () => {
    console.warn('saveUsers está obsoleto; usa la API de usuarios desde usuarios.service.');
    return false;
};

export { createUsuario, deleteUsuario, getSucursales, ROL_OPCIONES } from './usuarios.service';
