import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { labelColumna } from '../services/reportes.service';

const MONEY_KEYS = [
    'subtotal',
    'iva',
    'total',
    'saldo',
    'precioSugerido',
    'valorEstimado',
    'limiteCredito',
    'montoOriginal',
];

const TIPO_TITULO = {
    ventas: 'Ventas y facturación',
    inventario: 'Inventario y existencias',
    movimientos_inventario: 'Movimientos de inventario',
    clientes_cxc: 'Cartera y clientes (CXC)',
    balance_general: 'Balance general',
    estado_resultados: 'Estado de resultados',
};

function hoyIso() {
    return new Date().toISOString().slice(0, 10);
}

function formatValorPdf(key, value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (key === 'signo') return Number(value) > 0 ? 'Entrada' : 'Salida';
    if (key === 'estado') {
        const map = {
            activo: 'Al día',
            moroso: 'Moroso',
            sobre_limite: 'Sobre límite',
            PENDIENTE: 'Pendiente',
            VENCIDA: 'Vencida',
        };
        return map[value] || String(value);
    }
    if (MONEY_KEYS.includes(key) || key.toLowerCase().includes('saldo') || key.toLowerCase().includes('total')) {
        if (typeof value === 'number') return `$${value.toFixed(2)}`;
    }
    if (['stock', 'cantidad', 'stockMinimo'].includes(key) && typeof value === 'number') {
        return value.toLocaleString('es-VE');
    }
    return String(value);
}

function formatCondicionesPago(cp) {
    if (!cp) return '—';
    const labels = {
        efectivo_usd: 'Efectivo USD',
        efectivo_ves: 'Efectivo Bs',
        pago_movil: 'Pago móvil',
        transferencia: 'Transferencia',
        punto: 'Punto de venta',
        credito: 'Crédito',
        mixto: 'Pago mixto',
    };
    const [pm, tipo] = String(cp).split('|');
    const m = labels[pm] || pm;
    const t = tipo === 'delivery' ? ' · Delivery' : tipo === 'local' ? ' · Local' : '';
    return `${m}${t}`;
}

function nombreArchivoInforme(informe) {
    const tipo = (informe.tipo || 'informe').replace(/[^\w-]+/g, '_');
    const hasta = (informe.periodo?.hasta || hoyIso()).replace(/-/g, '');
    return `informe_gerencial_${tipo}_${hasta}.pdf`;
}

function labelTotal(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());
}

function dibujarEncabezado(pdf, informe, opciones) {
    const margen = 14;
    const empresa = opciones.empresaNombre || 'H2O MANAGER';
    const rif = opciones.empresaRif || '';
    let y = margen;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(0, 119, 204);
    pdf.text(empresa, margen, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    y += 7;
    if (rif) {
        pdf.text(`RIF: ${rif}`, margen, y);
        y += 5;
    }
    pdf.text('Informe gerencial', margen, y);
    y += 9;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);
    pdf.text(informe.titulo || TIPO_TITULO[informe.tipo] || 'Informe', margen, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const meta = [];
    if (informe.periodo?.desde || informe.periodo?.hasta) {
        meta.push(`Período: ${informe.periodo.desde || '—'} al ${informe.periodo.hasta || '—'}`);
    }
    if (opciones.sucursalId) {
        meta.push(`Sucursal: ${opciones.sucursalId}`);
    }
    meta.push(`Tipo: ${TIPO_TITULO[informe.tipo] || informe.tipo || '—'}`);
    meta.forEach((linea) => {
        pdf.text(linea, margen, y);
        y += 5;
    });

    if (informe.nota) {
        const notaLines = pdf.splitTextToSize(String(informe.nota), 180);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(notaLines, margen, y);
        y += notaLines.length * 4 + 2;
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
    }

    return y + 4;
}

function dibujarBloqueTotales(pdf, y, totales) {
    if (!totales || typeof totales !== 'object') return y;

    const filas = Object.entries(totales).map(([k, v]) => {
        let valor = v;
        if (typeof v === 'number' && (k.toLowerCase().includes('total') || k.toLowerCase().includes('saldo') || k.toLowerCase().includes('valor') || k.includes('Usd') || k === 'utilidadNeta' || k === 'ingresos' || k === 'egresos' || k === 'activo' || k === 'pasivo' || k === 'patrimonio')) {
            valor = `$${Number(v).toFixed(2)}`;
        } else if (typeof v === 'boolean') {
            valor = v ? 'Sí' : 'No';
        }
        return [labelTotal(k), String(valor)];
    });

    if (!filas.length) return y;

    autoTable(pdf, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: filas,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [241, 245, 249], textColor: 51, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 70 }, 1: { halign: 'right' } },
    });

    return (pdf.lastAutoTable?.finalY ?? y) + 8;
}

function tablaCuentasContables(pdf, y, titulo, cuentas) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.text(titulo, 14, y);
    y += 5;

    const body = (cuentas || []).length
        ? cuentas.map((c) => [
              c.codigo || '—',
              c.nombre || '—',
              `$${Number(c.saldo ?? 0).toFixed(2)}`,
          ])
        : [['Sin movimientos en el período', '', '']];

    autoTable(pdf, {
        startY: y,
        head: [['Código', 'Cuenta', 'Saldo']],
        body,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 119, 204], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 95 },
            2: { halign: 'right', cellWidth: 35 },
        },
    });

    return (pdf.lastAutoTable?.finalY ?? y) + 6;
}

function tablaFilas(pdf, y, informe) {
    const cols = informe.columnas?.length
        ? informe.columnas
        : Object.keys(informe.filas?.[0] || {});

    if (!cols.length) return y;

    const head = [cols.map((c) => labelColumna(c))];
    const body = (informe.filas || []).map((fila) =>
        cols.map((c) => {
            if (c === 'condicionesPago') return formatCondicionesPago(fila[c]);
            return formatValorPdf(c, fila[c]);
        })
    );

    if (!body.length) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.text('Sin registros para los filtros seleccionados.', 14, y);
        return y + 8;
    }

    autoTable(pdf, {
        startY: y,
        head,
        body,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 119, 204], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    return (pdf.lastAutoTable?.finalY ?? y) + 8;
}

function tablaCxcDocumentos(pdf, y, documentos) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Documentos CXC pendientes', 14, y);
    y += 5;

    autoTable(pdf, {
        startY: y,
        head: [['Cliente', 'Documento', 'Vencimiento', 'Saldo', 'Estado']],
        body: documentos.map((cx) => [
            cx.cliente || '—',
            cx.serieCorrelativo || '—',
            cx.vencimiento ? String(cx.vencimiento).slice(0, 10) : '—',
            `$${Number(cx.saldo ?? 0).toFixed(2)}`,
            cx.estado || '—',
        ]),
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
    });

    return (pdf.lastAutoTable?.finalY ?? y) + 8;
}

function piePagina(pdf, empresa) {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(
            `${empresa} — Informe gerencial — Generado ${new Date().toLocaleString('es-VE')} — Pág. ${i}/${totalPages}`,
            14,
            275
        );
    }
}

/**
 * Genera y descarga PDF del informe gerencial (misma data que la vista previa / API).
 */
export function descargarInformeGerencialPdf(informe, opciones = {}) {
    if (!informe) {
        throw new Error('No hay informe para exportar.');
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
    let y = dibujarEncabezado(pdf, informe, opciones);

    y = dibujarBloqueTotales(pdf, y, informe.totales);

    if (informe.tipo === 'estado_resultados' || informe.ingresos || informe.egresos) {
        y = tablaCuentasContables(pdf, y, 'Ingresos', informe.ingresos);
        const totIng = Number(informe.totales?.ingresos ?? 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`Total ingresos: $${totIng.toFixed(2)}`, 14, y);
        y += 8;

        y = tablaCuentasContables(pdf, y, 'Egresos', informe.egresos);
        const totEgr = Number(informe.totales?.egresos ?? 0);
        pdf.text(`Total egresos: $${totEgr.toFixed(2)}`, 14, y);
        y += 6;

        const util = Number(informe.totales?.utilidadNeta ?? totIng - totEgr);
        pdf.setFontSize(12);
        pdf.setTextColor(0, 119, 204);
        pdf.text(`Utilidad neta: $${util.toFixed(2)}`, 14, y);
        y += 10;
        pdf.setTextColor(60, 60, 60);
    } else if (informe.secciones?.length) {
        for (const sec of informe.secciones) {
            if (y > 240) {
                pdf.addPage();
                y = 20;
            }
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(`${sec.tipo || sec.titulo || 'Sección'} — Subtotal: $${Number(sec.subtotal ?? 0).toFixed(2)}`, 14, y);
            y += 5;

            const body = (sec.cuentas || []).map((c) => [
                c.codigo || '—',
                c.nombre || '—',
                `$${Number(c.saldo ?? 0).toFixed(2)}`,
            ]);

            autoTable(pdf, {
                startY: y,
                head: [['Código', 'Cuenta', 'Saldo']],
                body: body.length ? body : [['Sin saldo', '', '']],
                margin: { left: 14, right: 14 },
                styles: { fontSize: 9 },
                headStyles: { fillColor: [0, 119, 204], textColor: 255 },
            });
            y = (pdf.lastAutoTable?.finalY ?? y) + 8;
        }

        const t = informe.totales || {};
        if (t.activo != null) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text(`Total activo: $${Number(t.activo).toFixed(2)}`, 14, y);
            y += 6;
            pdf.text(`Pasivo + patrimonio: $${Number(t.pasivoPatrimonio ?? 0).toFixed(2)}`, 14, y);
            y += 6;
            if (t.cuadra != null) {
                pdf.setFont('helvetica', 'normal');
                pdf.text(
                    t.cuadra ? 'Balance cuadrado (Activo = Pasivo + Patrimonio)' : `Diferencia: $${Number(t.diferencia ?? 0).toFixed(2)}`,
                    14,
                    y
                );
                y += 8;
            }
        }
    } else {
        y = tablaFilas(pdf, y, informe);
    }

    if (informe.cxcDocumentos?.length) {
        if (y > 220) {
            pdf.addPage();
            y = 20;
        }
        y = tablaCxcDocumentos(pdf, y, informe.cxcDocumentos);
    }

    piePagina(pdf, opciones.empresaNombre || 'H2O MANAGER');
    pdf.save(nombreArchivoInforme(informe));
}
