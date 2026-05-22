/**
 * Servicios de Gestión de Clientes - H2OManager
 * Conecta con api-h2o-manager (Laravel) /api/v1/cliente
 */

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
/** Origen vacío en dev: rutas relativas `/api/...` */
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;

const CLIENTES_PATH = USE_VITE_PROXY
    ? '/api/v1/cliente'
    : `${PROD_API_ORIGIN}/api/v1/cliente`;

/**
 * Normaliza URLs de paginación de Laravel.
 * Con proxy, las URLs absolutas al host PHP se convierten en rutas `/api/...` del dev server.
 */
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

/** UI (Residencial / Comercial) → API (Natural / Jurídico) */
const uiTypeToApi = (type) => {
    if (type === 'Comercial') return 'Jurídico';
    return 'Natural';
};

/** API → UI */
const apiTypeToUi = (tipo) => {
    if (tipo === 'Jurídico') return 'Comercial';
    return 'Residencial';
};

/**
 * Estado comercial del cliente según saldo y límite de crédito.
 * - active: sin deuda pendiente
 * - delinquent: tiene saldo pendiente (moroso)
 * - overlimit: deuda supera el límite autorizado
 */
export function deriveClientStatus(row) {
    const saldo = Number(row?.saldo ?? 0);
    const limite = Number(row?.limiteCredito ?? 0);

    if (saldo <= 0.009) {
        return 'active';
    }
    if (limite > 0 && saldo > limite + 0.009) {
        return 'overlimit';
    }
    if (saldo > 0) {
        return 'delinquent';
    }
    return 'active';
}

export function creditoDisponible(client) {
    const limite = Number(client?.limiteCredito ?? 0);
    const saldo = Number(client?.saldo ?? 0);
    if (limite <= 0) return 0;
    return Math.max(0, limite - saldo);
}

export function puedeVenderCredito(client, montoVenta = 0) {
    const limite = Number(client?.limiteCredito ?? 0);
    if (limite <= 0) {
        return { ok: false, reason: 'El cliente no tiene límite de crédito configurado.' };
    }
    const disponible = creditoDisponible(client);
    const monto = Number(montoVenta);
    if (monto > disponible + 0.009) {
        return {
            ok: false,
            reason: `Crédito insuficiente. Disponible: $${disponible.toFixed(2)} · Límite: $${limite.toFixed(2)}`,
        };
    }
    return { ok: true, disponible, limite };
}

/** Respuesta de un ítem API → modelo usado en pantallas */
const mapApiToUi = (row) => {
    if (row == null || typeof row !== 'object') {
        throw new Error('Respuesta de cliente inválida desde la API.');
    }
    const saldo = Number(row.saldo ?? 0);
    const limiteCredito = row.limiteCredito != null ? Number(row.limiteCredito) : 0;
    const diasCredito = row.diasCredito != null ? Number(row.diasCredito) : 0;
    const status = deriveClientStatus({ saldo, limiteCredito });

    return {
        id: row.id,
        name: row.nombreRazonSocial ?? '',
        cedula: row.documentoIdentidad ?? '',
        email: '',
        phone: row.telefono ?? '',
        address: row.direccion ?? '',
        type: apiTypeToUi(row.tipo),
        saldo,
        status,
        limiteCredito,
        diasCredito,
        creditoDisponible: creditoDisponible({ saldo, limiteCredito }),
        tieneCredito: limiteCredito > 0,
    };
};

/** Formulario / filas UI → cuerpo StoreClienteRequest */
const mapFormToStoreApi = (client) => {
    const body = {
        nombreRazonSocial: client.name,
        rifCi: client.cedula,
        telefono: (client.phone || '').trim() || 'Sin especificar',
        direccion: (client.address || '').trim() || 'Sin especificar',
        tipo: uiTypeToApi(client.type || 'Residencial'),
        saldo: 0,
    };
    if (client.limiteCredito != null && client.limiteCredito !== '') {
        body.limiteCredito = Number(client.limiteCredito);
    }
    if (client.diasCredito != null && client.diasCredito !== '') {
        body.diasCredito = Number(client.diasCredito);
    }
    return body;
};

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

/** Obtiene todos los clientes siguiendo links.next de la paginación Laravel */
async function fetchAllClientesFromApi() {
    const rows = [];
    const seen = new Set();
    let nextUrl = resolvePaginationUrl(`${CLIENTES_PATH}?page=1`);
    let guard = 0;
    const maxPages = 500;

    while (nextUrl && guard < maxPages) {
        if (seen.has(nextUrl)) break;
        seen.add(nextUrl);

        const json = await apiGet(nextUrl);
        const chunk = Array.isArray(json.data) ? json.data : [];
        rows.push(...chunk.map(mapApiToUi));

        nextUrl = resolvePaginationUrl(json.links?.next);
        guard += 1;
    }
    return rows;
}

/**
 * Lista clientes (todas las páginas de la API).
 */
export const getClients = async () => {
    requireApiConfig();
    return await fetchAllClientesFromApi();
};

/**
 * No existe operación masiva en la API; usar add/update/delete por ítem.
 */
export const saveClients = async () => {
    requireApiConfig();
    console.warn('saveClients: no soportado en la API; usa addClient, updateClient o deleteClient.');
    return false;
};

/**
 * Crea cliente (formulario UI: name, cedula, email, phone, address, type).
 */
export const addClient = async (client) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(CLIENTES_PATH, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(mapFormToStoreApi(client)),
    });
    const body = await handleResponse(response);
    return mapApiToUi(body.data ?? body);
};

/**
 * Actualiza por id (PATCH). `updatedData` puede usar campos UI o camelCase API.
 */
export const updateClient = async (id, updatedData) => {
    requireApiConfig();
    const payload = {};
    if (updatedData.name != null) payload.nombreRazonSocial = updatedData.name;
    if (updatedData.cedula != null) payload.rifCi = updatedData.cedula;
    if (updatedData.phone != null) payload.telefono = updatedData.phone;
    if (updatedData.address != null) payload.direccion = updatedData.address;
    if (updatedData.type != null) payload.tipo = uiTypeToApi(updatedData.type);
    if (updatedData.limiteCredito != null && updatedData.limiteCredito !== '') {
        payload.limiteCredito = Number(updatedData.limiteCredito);
    }
    if (updatedData.diasCredito != null && updatedData.diasCredito !== '') {
        payload.diasCredito = Number(updatedData.diasCredito);
    }

    const response = await fetchWithNetworkHint(`${CLIENTES_PATH}/${id}`, {
        method: 'PATCH',
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return mapApiToUi(body.data ?? body);
};

export const deleteClient = async (id) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${CLIENTES_PATH}/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
    });
    await handleResponse(response);
    return true;
};
