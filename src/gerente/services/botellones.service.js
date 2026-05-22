/**
 * Inventario — API Laravel
 * - GET  /api/v1/inventario/resumen
 * - POST /api/v1/inventario/ajuste
 * - CRUD /api/v1/item
 * - GET  /api/v1/movimientoInventario (historial con detalle)
 */

import { getAuthHeaders } from '../../auth/auth.service';
import { getCuentas } from './contabilidad.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;
const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const INVENTARIO_PATH = USE_VITE_PROXY ? '/api/v1/inventario' : `${PROD_API_ORIGIN}/api/v1/inventario`;
const ITEM_PATH = USE_VITE_PROXY ? '/api/v1/item' : `${PROD_API_ORIGIN}/api/v1/item`;
const MOV_PATH = USE_VITE_PROXY ? '/api/v1/movimientoInventario' : `${PROD_API_ORIGIN}/api/v1/movimientoInventario`;

const TIPO_BOTELLON = 'PRODUCTO';
const TIPO_SERVICIO = 'SERVICIO';
const TIPO_INSUMO = 'INSUMO';

const TIPO_UI_MAP = {
    botellon: TIPO_BOTELLON,
    servicio: TIPO_SERVICIO,
    insumo: TIPO_INSUMO,
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
    if (url.startsWith('/')) return BASE_URL ? `${BASE_URL}${url}` : url;
    if (BASE_URL) return `${BASE_URL}/${url}`.replace(/([^:]\/)\/+/g, '$1');
    return `/${url}`.replace(/\/+/g, '/');
}

function authJsonHeaders() {
    return getAuthHeaders({
        'Content-Type': 'application/json',
    });
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

function formatApiError(body, status) {
    const errs = body?.errors;
    if (errs?.cuentaContableVentaId) {
        const det = Array.isArray(errs.cuentaContableVentaId)
            ? errs.cuentaContableVentaId.join(' ')
            : String(errs.cuentaContableVentaId);
        return `Cuenta contable de venta no válida: ${det} Elija una cuenta de tipo Ingreso en el formulario.`;
    }
    if (errs) {
        return Object.values(errs).flat().join(' ');
    }
    return body?.message || `Error HTTP ${status}`;
}

async function handleResponse(response) {
    const body = await parseJsonSafe(response);
    if (response.ok) return body;
    throw new Error(formatApiError(body, response.status));
}

/** Cuentas del plan contable aptas para registrar ingresos por venta. */
export async function getCuentasIngresoOpciones() {
    const cuentas = await getCuentas();
    const ingresos = cuentas.filter((c) => /^ingreso$/i.test(String(c.tipo || '').trim()));
    return ingresos.length > 0 ? ingresos : cuentas;
}

export function esCuentaIngresoValida(cuentaId, opciones = []) {
    const id = Number(cuentaId);
    return Number.isFinite(id) && id > 0 && opciones.some((c) => Number(c.id) === id);
}

export function cuentaIngresoPorDefecto(opciones = []) {
    if (!opciones.length) return null;
    return (
        opciones.find((c) => c.codigo === '4.1.02') ||
        opciones.find((c) => /venta/i.test(String(c.nombre || ''))) ||
        opciones[0]
    );
}

async function fetchWithNetworkHint(url, init = {}) {
    try {
        return await fetch(url, init);
    } catch (e) {
        const hint =
            e?.message?.includes('Failed to fetch') || e?.name === 'TypeError'
                ? USE_VITE_PROXY
                    ? ' Reinicia `npm run dev` y verifica que Laragon esté activo.'
                    : ' Comprueba VITE_API_URL y CORS.'
                : '';
        throw new Error(`No se pudo conectar con la API.${hint} (${e?.message || e})`);
    }
}

async function apiGet(url) {
    const response = await fetchWithNetworkHint(url, {
        headers: getAuthHeaders(),
    });
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

function mapResumenToUi(row) {
    const controlaStock = row.controlaStock !== false && row.tipo !== TIPO_SERVICIO;
    return {
        id: Number(row.id),
        name: row.nombre || `Item ${row.id}`,
        nombre: row.nombre,
        sku: row.sku || '',
        unit: row.unidadMedida || 'UN',
        unidadMedida: row.unidadMedida || 'UN',
        stock: controlaStock ? Number(row.stock ?? 0) : null,
        minStock: Number(row.stockMinimo ?? 0),
        stockMinimo: Number(row.stockMinimo ?? 0),
        type: row.tipo || TIPO_BOTELLON,
        tipoLabel:
            row.tipo === TIPO_SERVICIO
                ? 'Servicio'
                : row.tipo === TIPO_INSUMO
                  ? 'Insumo'
                  : 'Producto',
        price: Number(row.precioSugerido ?? 0),
        precioSugerido: Number(row.precioSugerido ?? 0),
        proveedorId: Number(row.proveedorId ?? 0),
        cuentaContableVentaId: Number(row.cuentaContableVentaId ?? 0),
        gravaIva: Boolean(row.gravaIva),
        stockBajo: controlaStock && Boolean(row.stockBajo),
        controlaStock,
    };
}

/**
 * @param {'PRODUCTO'|'SERVICIO'|'INSUMO'|null} tipoFilter
 */
export const getInventory = async (sucursalId = DEFAULT_SUCURSAL_ID, tipoFilter = null) => {
    requireApiConfig();
    let url = `${INVENTARIO_PATH}/resumen?sucursalId=${sucursalId}`;
    if (tipoFilter) url += `&tipo=${encodeURIComponent(tipoFilter)}`;
    const json = await apiGet(url);
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.map(mapResumenToUi);
};

const TIPO_LABELS = {
    compra: 'Entrada (compra)',
    venta: 'Salida (venta)',
    ajuste: 'Ajuste',
    traslado: 'Traslado',
    merma: 'Merma',
};

function flattenMovimientos(movimientos) {
    const rows = [];
    for (const m of movimientos) {
        const detalles = Array.isArray(m.detalles) ? m.detalles : [];
        if (detalles.length > 0) {
            for (const d of detalles) {
                const signo = Number(d.signo ?? 0);
                rows.push({
                    id: `${m.id}-${d.id ?? d.itemId}`,
                    movimientoId: m.id,
                    fecha: m.fecha,
                    tipo: m.tipo,
                    tipoLabel: TIPO_LABELS[m.tipo] || m.tipo,
                    itemNombre: d.itemNombre || '—',
                    itemSku: d.itemSku || '',
                    cantidad: Number(d.cantidad ?? 0),
                    signo,
                    esEntrada: signo > 0,
                    sucursalNombre: m.sucursalNombre,
                    usuarioNombre: m.usuarioNombre,
                    referenciaDoc: m.referenciaDoc,
                    motivo: d.motivo,
                });
            }
        } else {
            rows.push({
                id: String(m.id),
                movimientoId: m.id,
                fecha: m.fecha,
                tipo: m.tipo,
                tipoLabel: TIPO_LABELS[m.tipo] || m.tipo,
                itemNombre: '—',
                itemSku: '',
                cantidad: null,
                signo: m.tipo === 'compra' ? 1 : -1,
                esEntrada: m.tipo === 'compra' || m.tipo === 'ajuste',
                sucursalNombre: m.sucursalNombre,
                usuarioNombre: m.usuarioNombre,
                referenciaDoc: m.referenciaDoc,
                motivo: null,
            });
        }
    }
    return rows.sort((a, b) => new Date(String(b.fecha).replace(' ', 'T')) - new Date(String(a.fecha).replace(' ', 'T')));
}

export const getHistory = async (sucursalId = DEFAULT_SUCURSAL_ID) => {
    requireApiConfig();
    const raw = await fetchAllPages(`${MOV_PATH}?sucursalId[eq]=${sucursalId}&page=1`);
    return flattenMovimientos(raw);
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
    const tipoUi = form.tipoInventario || form.tipo || 'botellon';
    const tipo = TIPO_UI_MAP[tipoUi] || TIPO_BOTELLON;

    return {
        sku: String(form.sku || '').trim(),
        nombre: String(form.nombre || '').trim(),
        tipo,
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
    const response = await fetchWithNetworkHint(ITEM_PATH, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(normalizeItemPayload(form)),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

export const updateItem = async (itemId, form) => {
    requireApiConfig();
    const response = await fetchWithNetworkHint(`${ITEM_PATH}/${itemId}`, {
        method: 'PATCH',
        headers: authJsonHeaders(),
        body: JSON.stringify(normalizeItemPayload(form)),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
};

/**
 * @param {'in'|'out'} type
 */
export const updateStock = async (itemId, amount, type, note = '', context = {}) => {
    requireApiConfig();
    const sucursalId = Number(context.sucursalId ?? DEFAULT_SUCURSAL_ID);
    const usuarioId = Number(context.usuarioId ?? 1);

    const response = await fetchWithNetworkHint(`${INVENTARIO_PATH}/ajuste`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({
            sucursalId,
            itemId: Number(itemId),
            cantidad: Number(amount),
            direccion: type === 'in' ? 'entrada' : 'salida',
            usuarioId,
            motivo: note || (type === 'in' ? 'Entrada de inventario' : 'Salida de inventario'),
        }),
    });

    const body = await handleResponse(response);
    const data = body?.data ?? body;
    return {
        itemId: data?.itemId,
        stockAnterior: data?.stockAnterior,
        stockNuevo: data?.stockNuevo,
        cantidad: data?.cantidad,
        direccion: data?.direccion,
        movimiento: data?.movimiento,
    };
};

export { TIPO_BOTELLON, TIPO_SERVICIO, TIPO_INSUMO, DEFAULT_SUCURSAL_ID };

export const saveInventoryConfig = async () => {
    throw new Error('saveInventoryConfig no está soportado con la API actual.');
};
