/**
 * Ventas - API Laravel /api/v1/documentoFiscal
 */

import { getAuthHeaders, getStoredAuth } from '../../auth/auth.service';
import { calcularLinea, roundMoney } from './ventas-calculo';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE_URL = USE_VITE_PROXY ? '' : PROD_API_ORIGIN;
const DOC_PATH = USE_VITE_PROXY ? '/api/v1/documentoFiscal' : `${PROD_API_ORIGIN}/api/v1/documentoFiscal`;
const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

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

function splitCondicion(condicion) {
    // Convención interna frontend: "paymentMethod|type"
    if (typeof condicion !== 'string') return { paymentMethod: 'efectivo_usd', type: 'local' };
    const [paymentMethod, type] = condicion.split('|');
    return {
        paymentMethod: paymentMethod || 'efectivo_usd',
        esCredito: paymentMethod === 'credito',
        type: type === 'delivery' ? 'delivery' : 'local',
    };
}

function mapDocumentoToSale(doc) {
    const { paymentMethod, type } = splitCondicion(doc.condicionesPago);
    const dateIso = doc.fecha ? String(doc.fecha).replace(' ', 'T') : new Date().toISOString();
    const totalUSD = Number(doc.total ?? 0);
    const detalles = Array.isArray(doc.detalles) ? doc.detalles : [];

    return {
        id: String(doc.serieCorrelativo || `DOC-${doc.id}`),
        date: dateIso,
        client: {
            name: doc.cliente || 'Cliente',
            cedula: '',
        },
        type,
        paymentMethod,
        totalUSD,
        totalVES: 0,
        items: detalles.map((d) => ({
            qty: Number(d.cantidad ?? 0),
            title: d.nombreItem || `Item ${d.itemId}`,
            price: Number(d.precioUnitario ?? 0),
        })),
    };
}

async function fetchAllDocuments() {
    const rows = [];
    const seen = new Set();
    let nextUrl = resolvePaginationUrl(`${DOC_PATH}?incluirDetalle=1&page=1`);
    let guard = 0;

    while (nextUrl && guard < 500) {
        if (seen.has(nextUrl)) break;
        seen.add(nextUrl);
        const response = await fetchWithNetworkHint(nextUrl, { headers: { Accept: 'application/json' } });
        const json = await handleResponse(response);
        const chunk = Array.isArray(json.data) ? json.data : [];
        rows.push(...chunk);
        nextUrl = resolvePaginationUrl(json.links?.next);
        guard += 1;
    }
    return rows;
}

async function fetchDocumentById(id) {
    const response = await fetchWithNetworkHint(`${DOC_PATH}/${id}?incluirDetalle=1`, {
        headers: { Accept: 'application/json' },
    });
    const json = await handleResponse(response);
    return json?.data ?? json;
}

export const getSales = async () => {
    requireApiConfig();
    const docs = await fetchAllDocuments();
    return docs.map(mapDocumentoToSale);
};

/** Documento API → formato usado en Historial y PDF */
export function mapDocumentoToHistorial(doc) {
    if (!doc || typeof doc !== 'object') {
        throw new Error('Documento inválido.');
    }
    return {
        id: doc.id,
        serieCorrelativo: doc.serieCorrelativo,
        fecha: doc.fecha,
        cliente: doc.cliente,
        sucursal: doc.sucursal,
        tipoDoc: doc.tipoDoc,
        condicionesPago: doc.condicionesPago,
        subtotal: Number(doc.subtotal ?? 0),
        iva: Number(doc.iva ?? 0),
        total: Number(doc.total ?? 0),
        estado: doc.estado,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        detalles: Array.isArray(doc.detalles)
            ? doc.detalles.map((d) => ({
                  id: d.id,
                  itemId: Number(d.itemId ?? 0),
                  nombreItem: d.nombreItem || null,
                  cantidad: Number(d.cantidad ?? 0),
                  precioUnitario: Number(d.precioUnitario ?? 0),
                  ivaMonto: Number(d.ivaMonto ?? 0),
                  totalLineas: Number(d.totalLineas ?? 0),
              }))
            : [],
    };
}

/**
 * Historial en formato API (sin transformar a modelo legado de ventas).
 */
export const getSalesHistory = async () => {
    requireApiConfig();
    const docs = await fetchAllDocuments();
    return docs.map(mapDocumentoToHistorial);
};

/** Detalle completo de un documento (con líneas) para modal / PDF */
export const getDocumentoHistorial = async (id) => {
    requireApiConfig();
    const doc = await fetchDocumentById(id);
    return mapDocumentoToHistorial(doc);
};

function toMysqlDatetime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function mapSaleItemsToDetalles(items = [], ivaPorcentaje = 0) {
    return items
        .map((item) => {
            const cantidad = Number(item.qty ?? item.cantidad ?? 0);
            const precioUnitario = Number(item.price ?? item.precioUnitario ?? 0);
            const itemId = Number(item.id ?? item.itemId);
            if (!Number.isFinite(itemId) || itemId <= 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
                return null;
            }

            let ivaMonto = Number(item.ivaMonto);
            let totalLineas = Number(item.totalLineas);
            if (!Number.isFinite(ivaMonto) || !Number.isFinite(totalLineas)) {
                const line = calcularLinea(
                    { qty: cantidad, price: precioUnitario, gravaIva: item.gravaIva },
                    ivaPorcentaje
                );
                ivaMonto = line.ivaMonto;
                totalLineas = line.totalLinea;
            } else {
                ivaMonto = roundMoney(ivaMonto);
                totalLineas = roundMoney(totalLineas);
            }

            return {
                itemId,
                cantidad,
                precioUnitario,
                ivaMonto,
                totalLineas,
            };
        })
        .filter(Boolean);
}

export const createSale = async (saleData) => {
    requireApiConfig();

    const clientId = Number(saleData?.client?.id);
    if (!Number.isFinite(clientId)) {
        throw new Error('La API solo permite ventas con clientes registrados.');
    }

    const now = new Date();
    const correlativo = `WEB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;
    const ivaPorcentaje = Number(saleData?.ivaPorcentaje ?? 0);
    const detalles = mapSaleItemsToDetalles(saleData?.items || [], ivaPorcentaje);
    if (detalles.length === 0) {
        throw new Error('Debes agregar al menos un item al documento fiscal.');
    }
    const subtotal = roundMoney(
        detalles.reduce((acc, d) => acc + Number(d.cantidad) * Number(d.precioUnitario), 0)
    );
    const iva = roundMoney(detalles.reduce((acc, d) => acc + Number(d.ivaMonto || 0), 0));
    const total = roundMoney(detalles.reduce((acc, d) => acc + Number(d.totalLineas || 0), 0));
    const session = getStoredAuth();
    const payload = {
        sucursalId: Number(session?.user?.sucursalId ?? DEFAULT_SUCURSAL_ID),
        usuarioId: Number(session?.user?.id ?? 1),
        tipoDoc: 'Factura',
        serieCorrelativo: correlativo,
        fecha: toMysqlDatetime(now),
        clienteId: clientId,
        condicionesPago: `${saleData.paymentMethod || 'efectivo_usd'}|${saleData.type || 'local'}`,
        subtotal,
        iva,
        total,
        estado: 'emitido',
        detalles,
    };

    const response = await fetchWithNetworkHint(DOC_PATH, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    const created = body?.data ?? body;
    if (created?.id != null) {
        try {
            const withDetail = await fetchDocumentById(created.id);
            return mapDocumentoToSale(withDetail);
        } catch {
            return mapDocumentoToSale(created);
        }
    }
    return mapDocumentoToSale(created);
};