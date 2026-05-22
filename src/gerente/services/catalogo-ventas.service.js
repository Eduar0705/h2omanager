/**
 * Catálogo para ventas: productos, servicios e insumos.
 * GET /api/v1/inventario/catalogo-ventas
 */

import { getAuthHeaders } from '../../auth/auth.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const CATALOGO_PATH = USE_VITE_PROXY
    ? '/api/v1/inventario/catalogo-ventas'
    : `${PROD_API_ORIGIN}/api/v1/inventario/catalogo-ventas`;

export const TIPOS_VENTA = {
    TODOS: null,
    PRODUCTO: 'PRODUCTO',
    SERVICIO: 'SERVICIO',
    INSUMO: 'INSUMO',
};

export const TIPO_FILTROS = [
    { id: 'todos', label: 'Todos', tipo: null, color: '#64748b' },
    { id: 'PRODUCTO', label: 'Productos', tipo: 'PRODUCTO', color: '#0077cc' },
    { id: 'SERVICIO', label: 'Servicios', tipo: 'SERVICIO', color: '#8b5cf6' },
    { id: 'INSUMO', label: 'Insumos', tipo: 'INSUMO', color: '#f59e0b' },
];

export const TIPO_LABELS = {
    PRODUCTO: 'Producto',
    SERVICIO: 'Servicio',
    INSUMO: 'Insumo',
};

function requireApiConfig() {
    if (!USE_VITE_PROXY && !PROD_API_ORIGIN) {
        throw new Error('Configura VITE_API_URL en .env para el build de producción.');
    }
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

function mapToUi(row) {
    const controlaStock = row.controlaStock !== false && row.tipo !== 'SERVICIO';
    return {
        id: Number(row.id),
        name: row.nombre,
        nombre: row.nombre,
        sku: row.sku || '',
        tipo: row.tipo,
        tipoLabel: TIPO_LABELS[row.tipo] || row.tipo,
        unit: row.unidadMedida || 'UN',
        price: Number(row.precioSugerido ?? 0),
        stock: controlaStock ? Number(row.stock ?? 0) : null,
        controlaStock,
        gravaIva: Boolean(row.gravaIva),
    };
}

/**
 * @param {number} sucursalId
 * @param {'PRODUCTO'|'SERVICIO'|'INSUMO'|null} tipoFilter
 */
export async function getCatalogoVentas(sucursalId = 1, tipoFilter = null) {
    requireApiConfig();
    let url = `${CATALOGO_PATH}?sucursalId=${sucursalId}`;
    if (tipoFilter) {
        url += `&tipo=${encodeURIComponent(tipoFilter)}`;
    }
    const response = await fetch(url, { headers: getAuthHeaders() });
    const json = await handleResponse(response);
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.map(mapToUi);
}
