/**
 * Inventario de botellones contra API Laravel:
 * - /api/v1/item
 * - /api/v1/inventarioExistencia
 * - /api/v1/movimientoInventario
 */

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;
const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);
const DEFAULT_USER_ID = Number(import.meta.env.VITE_DEFAULT_USER_ID || 1);

const ITEM_PATH = USE_VITE_PROXY ? '/api/v1/item' : `${PROD_API_ORIGIN}/api/v1/item`;
const EXIST_PATH = USE_VITE_PROXY ? '/api/v1/inventarioExistencia' : `${PROD_API_ORIGIN}/api/v1/inventarioExistencia`;
const MOV_PATH = USE_VITE_PROXY ? '/api/v1/movimientoInventario' : `${PROD_API_ORIGIN}/api/v1/movimientoInventario`;
const ALLOWED_ITEM_TYPES = new Set(['PRODUCTO', 'INSUMO']);

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
    if (url.startsWith('/')) return BASE_URL ? `${BASE_URL}${url}` : url;
    if (BASE_URL) return `${BASE_URL}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    return `/${url}`.replace(/\/+/g, '/');
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

async function fetchAllPages(startUrl) {
    const rows = [];
    const seen = new Set();
    let nextUrl = resolvePaginationUrl(startUrl);
    let guard = 0;
    while (nextUrl && guard < 500) {
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

function toMysqlDatetime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const getInventory = async () => {
    requireApiConfig();
    const [itemsRaw, existRaw] = await Promise.all([
        fetchAllPages(`${ITEM_PATH}?page=1`),
        fetchAllPages(`${EXIST_PATH}?page=1`),
    ]);

    const existByItem = new Map(
        existRaw
            .filter((e) => Number(e.sucursalId) === DEFAULT_SUCURSAL_ID)
            .map((e) => [Number(e.itemId), Number(e.cantidadActual || 0)])
    );

    return itemsRaw
        .filter((i) => !i.deletedAt)
        .filter((i) => ALLOWED_ITEM_TYPES.has(String(i.tipo || '').trim().toUpperCase()))
        .map((i) => ({
            id: Number(i.id),
            name: i.nombre || `Item ${i.id}`,
            sku: i.sku || '',
            unit: i.unidadMedida || 'UN',
            stock: existByItem.get(Number(i.id)) || 0,
            minStock: Number(i.stockMinimo || 0),
            type: i.tipo || 'PRODUCTO',
            price: Number(i.precioSugerido || 0),
            proveedorId: Number(i.proveedorId || 0),
            cuentaContableVentaId: Number(i.cuentaContableVentaId || 0),
            gravaIva: Boolean(i.gravaIva),
            stockMinimo: Number(i.stockMinimo || 0),
            unidadMedida: i.unidadMedida || 'UN',
            nombre: i.nombre || `Item ${i.id}`,
        }));
};

export const getHistory = async () => {
    requireApiConfig();
    const rows = await fetchAllPages(`${MOV_PATH}?sucursalId[eq]=${DEFAULT_SUCURSAL_ID}&page=1`);
    return rows.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        referenciaDoc: m.referenciaDoc,
        sucursalNombre: m.sucursalNombre,
        usuarioNombre: m.usuarioNombre,
    }));
};

export const getProveedoresOpciones = async () => {
    requireApiConfig();
    const proveedorPath = USE_VITE_PROXY ? '/api/v1/proveedor' : `${PROD_API_ORIGIN}/api/v1/proveedor`;
    const rows = await fetchAllPages(`${proveedorPath}?page=1`);
    return rows
        .filter((p) => !p.deletedAt)
        .map((p) => ({
            id: Number(p.id),
            label: p.razonSocial || `Proveedor ${p.id}`,
        }));
};

function normalizeItemPayload(form) {
    return {
        sku: String(form.sku || '').trim(),
        nombre: String(form.nombre || '').trim(),
        // La API actualmente valida PRODUCTO/SERVICIO
        tipo: 'PRODUCTO',
        unidadMedida: String(form.unidadMedida || '').trim() || 'UN',
        gravaIva: Boolean(form.gravaIva),
        proveedorId: Number(form.proveedorId),
        stockMinimo: Number(form.stockMinimo ?? 0),
        precioSugerido: Number(form.precioSugerido ?? 0),
        cuentaContableVentaId: Number(form.cuentaContableVentaId),
    };
}

export const createItem = async (form) => {
    requireApiConfig();
    const payload = normalizeItemPayload(form);
    const response = await fetchWithNetworkHint(ITEM_PATH, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

export const updateItem = async (itemId, form) => {
    requireApiConfig();
    const payload = normalizeItemPayload(form);
    const response = await fetchWithNetworkHint(`${ITEM_PATH}/${itemId}`, {
        method: 'PATCH',
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

/**
 * type: 'in' | 'out'
 */
export const updateStock = async (itemId, amount, type, note = '') => {
    requireApiConfig();
    const inventory = await getInventory();
    const item = inventory.find((i) => Number(i.id) === Number(itemId));
    if (!item) throw new Error('Item no encontrado');

    const oldStock = Number(item.stock || 0);
    const delta = Number(amount || 0);
    const newStock = type === 'in' ? oldStock + delta : oldStock - delta;
    if (!Number.isFinite(delta) || delta <= 0) throw new Error('Cantidad inválida');
    if (newStock < 0) throw new Error('Stock insuficiente');

    const updatePayload = {
        sucursalId: DEFAULT_SUCURSAL_ID,
        itemId: Number(itemId),
        cantidadActual: newStock,
    };

    const movimientoPayload = {
        fecha: toMysqlDatetime(new Date()),
        sucursalId: DEFAULT_SUCURSAL_ID,
        usuarioId: DEFAULT_USER_ID,
        tipo: type === 'in' ? 'compra' : 'venta',
        referenciaDoc: `${note || 'Ajuste inventario'} | item:${item.sku || item.name} | ${oldStock}->${newStock}`,
    };

    const [existRes, movRes] = await Promise.all([
        fetchWithNetworkHint(EXIST_PATH, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(updatePayload),
        }).then(handleResponse),
        fetchWithNetworkHint(MOV_PATH, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(movimientoPayload),
        }).then(handleResponse),
    ]);

    return {
        itemId: Number(itemId),
        oldStock,
        newStock,
        cantidad: delta,
        existencia: existRes?.data ?? existRes,
        movimiento: movRes?.data ?? movRes,
    };
};

export const saveInventoryConfig = async () => {
    throw new Error('saveInventoryConfig no está soportado con la API actual.');
};