import { getAuthHeaders } from '../../auth/auth.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const DASH_PATH = USE_VITE_PROXY ? '/api/v1/reportes/dashboard' : `${PROD_API_ORIGIN}/api/v1/reportes/dashboard`;

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

export async function getDashboardResumen(sucursalId = 1) {
    requireApiConfig();
    const response = await fetch(`${DASH_PATH}?sucursalId=${sucursalId}`, {
        headers: getAuthHeaders(),
    });
    const body = await parseJsonSafe(response);
    if (!response.ok) {
        const msg =
            body?.message ||
            (body?.errors && Object.values(body.errors).flat().join(' ')) ||
            `Error HTTP ${response.status}`;
        throw new Error(msg);
    }
    return body?.data ?? body;
}
