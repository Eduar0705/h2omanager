/**
 * Módulo contable — /api/v1/contabilidad
 */

import { getAuthHeaders } from '../../auth/auth.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = USE_VITE_PROXY ? '/api/v1/contabilidad' : `${PROD_API_ORIGIN}/api/v1/contabilidad`;

function requireApiConfig() {
    if (!USE_VITE_PROXY && !PROD_API_ORIGIN) {
        throw new Error('Configura VITE_API_URL en .env para producción.');
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

async function fetchApi(url, init = {}) {
    try {
        return await fetch(url, init);
    } catch (e) {
        throw new Error(`No se pudo conectar con la API. (${e?.message || e})`);
    }
}

function queryString(params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `?${s}` : '';
}

export async function getCuentas() {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/cuentas`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    const rows = Array.isArray(body?.data) ? body.data : [];
    return rows.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        tipo: r.tipo,
    }));
}

export async function createCuenta(payload) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/cuentas`, {
        method: 'POST',
        headers: getAuthHeaders({
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(res);
    return body?.data ?? body;
}

function mapAsiento(row) {
    return {
        id: row.id,
        fecha: row.fecha,
        origen: row.origen,
        referencia: row.referencia,
        sucursalId: row.sucursalId,
        totalDebe: Number(row.totalDebe ?? 0),
        totalHaber: Number(row.totalHaber ?? 0),
        detalles: Array.isArray(row.detalles)
            ? row.detalles.map((d) => ({
                id: d.id,
                cuentaId: d.cuentaId,
                cuentaCodigo: d.cuentaCodigo,
                cuentaNombre: d.cuentaNombre,
                debe: Number(d.debe ?? 0),
                haber: Number(d.haber ?? 0),
            }))
            : [],
    };
}

export async function getAsientos(filters = {}) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/asientos${queryString(filters)}`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    const rows = Array.isArray(body?.data) ? body.data : [];
    return {
        data: rows.map(mapAsiento),
        meta: body?.meta ?? null,
        links: body?.links ?? null,
    };
}

export async function getAsiento(id) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/asientos/${id}`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    return mapAsiento(body?.data ?? body);
}

export async function createAsiento(payload) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/asientos`, {
        method: 'POST',
        headers: getAuthHeaders({
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
    });
    const body = await handleResponse(res);
    return mapAsiento(body?.data ?? body);
}

export async function getBalanceGeneral(filters = {}) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/balance-general${queryString(filters)}`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    return body?.data ?? body;
}

export async function getEstadoResultados(filters = {}) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/estado-resultados${queryString(filters)}`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    return body?.data ?? body;
}

export const TIPOS_CUENTA = ['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Egreso'];

export async function getDiagnostico(filters = {}) {
    requireApiConfig();
    const res = await fetchApi(`${BASE}/diagnostico${queryString(filters)}`, {
        headers: getAuthHeaders({ Accept: 'application/json' }),
    });
    const body = await handleResponse(res);
    return body?.data ?? body;
}
