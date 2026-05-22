import { getAuthHeaders } from '../../auth/auth.service';

const USE_VITE_PROXY = import.meta.env.DEV;
const PROD_API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = USE_VITE_PROXY ? '/api/v1/reportes' : `${PROD_API_ORIGIN}/api/v1/reportes`;

export const TIPOS_INFORME = [
    { id: 'ventas', label: 'Ventas y facturación', requiereFechas: true },
    { id: 'inventario', label: 'Inventario y existencias', requiereFechas: false },
    { id: 'movimientos_inventario', label: 'Movimientos de inventario', requiereFechas: true },
    { id: 'clientes_cxc', label: 'Cartera y clientes (CXC)', requiereFechas: false },
    { id: 'balance_general', label: 'Balance general', requiereFechas: true },
    { id: 'estado_resultados', label: 'Estado de resultados', requiereFechas: true },
];

const COLUMN_LABELS = {
    fecha: 'Fecha',
    serieCorrelativo: 'Documento',
    cliente: 'Cliente',
    condicionesPago: 'Condición de pago',
    subtotal: 'Subtotal',
    iva: 'IVA',
    total: 'Total',
    estado: 'Estado',
    sku: 'SKU',
    nombre: 'Nombre',
    tipo: 'Tipo',
    stock: 'Stock',
    stockMinimo: 'Mínimo',
    stockBajo: 'Stock bajo',
    precioSugerido: 'Precio',
    valorEstimado: 'Valor est.',
    item: 'Ítem',
    cantidad: 'Cantidad',
    signo: 'Signo',
    referenciaDoc: 'Referencia',
    motivo: 'Motivo',
    usuario: 'Usuario',
    documento: 'RIF/CI',
    saldo: 'Saldo',
    limiteCredito: 'Límite crédito',
    diasCredito: 'Días crédito',
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

export function labelColumna(key) {
    return COLUMN_LABELS[key] || key;
}

export async function generarInforme({ tipo, sucursalId, fechaDesde, fechaHasta }) {
    requireApiConfig();
    const params = new URLSearchParams({ tipo });
    if (sucursalId) params.set('sucursalId', String(sucursalId));
    if (fechaDesde) params.set('fechaDesde', fechaDesde);
    if (fechaHasta) params.set('fechaHasta', fechaHasta);

    const response = await fetch(`${BASE}/generar?${params}`, {
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

export function informeToCsv(informe) {
    if (!informe?.filas?.length && !informe?.secciones?.length) {
        return 'Sin datos para exportar\n';
    }

    if (informe.secciones?.length) {
        const lines = [`${informe.titulo}`, ''];
        for (const sec of informe.secciones) {
            lines.push(sec.titulo || sec.tipo || 'Sección');
            for (const c of sec.cuentas || []) {
                lines.push(`${c.codigo},${c.nombre},${c.saldo}`);
            }
            lines.push(`Subtotal,${sec.subtotal ?? ''}`);
            lines.push('');
        }
        return lines.join('\n');
    }

    const cols = informe.columnas || Object.keys(informe.filas[0] || {});
    const header = cols.map((c) => labelColumna(c)).join(',');
    const rows = informe.filas.map((fila) =>
        cols
            .map((c) => {
                const v = fila[c];
                if (v == null) return '';
                const s = String(v).replace(/"/g, '""');
                return s.includes(',') ? `"${s}"` : s;
            })
            .join(',')
    );
    return [header, ...rows].join('\n');
}
