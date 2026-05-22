/**
 * Abonos a cuentas por cobrar — /api/v1/cliente/{id}/...
 */

import { getAuthHeaders } from '../../auth/auth.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const CLIENTES_PATH = USE_VITE_PROXY
    ? '/api/v1/cliente'
    : `${PROD_API_ORIGIN}/api/v1/cliente`;

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

async function fetchWithNetworkHint(url, init = {}) {
    try {
        return await fetch(url, init);
    } catch (e) {
        throw new Error(`No se pudo conectar con la API. (${e?.message || e})`);
    }
}

function mapCxcRow(row) {
    return {
        id: row.id,
        clienteId: row.clienteId,
        docId: row.docId,
        fecha: row.fecha,
        vencimiento: row.vencimiento,
        saldo: Number(row.saldo ?? 0),
        estado: row.estado,
        serieCorrelativo: row.serieCorrelativo,
        totalFactura: row.totalFactura != null ? Number(row.totalFactura) : null,
    };
}

export async function getCuentasPorCobrar(clienteId) {
    requireApiConfig();
    const id = Number(clienteId);
    if (!Number.isFinite(id)) throw new Error('Cliente inválido.');

    const response = await fetchWithNetworkHint(`${CLIENTES_PATH}/${id}/cuentas-por-cobrar`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(response);
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
    return rows.map(mapCxcRow);
}

export async function registrarAbono(clienteId, payload) {
    requireApiConfig();
    const id = Number(clienteId);
    if (!Number.isFinite(id)) throw new Error('Cliente inválido.');

    const response = await fetchWithNetworkHint(`${CLIENTES_PATH}/${id}/abono`, {
        method: 'POST',
        headers: getAuthHeaders({
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(response);
    return body?.data ?? body;
}
