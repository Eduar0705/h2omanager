import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAY_LABELS = {
    efectivo_usd: 'Efectivo USD',
    efectivo_ves: 'Efectivo Bs',
    pago_movil: 'Pago móvil',
    transferencia: 'Transferencia',
    punto: 'Punto de venta',
    credito: 'Crédito',
    mixto: 'Pago mixto',
};

function formatFecha(doc) {
    const d = new Date(String(doc.fecha || '').replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(doc.fecha || '—');
    return d.toLocaleString('es-VE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatCondicionesPago(cp) {
    if (!cp) return '—';
    const [pm, tipo] = String(cp).split('|');
    const metodo = PAY_LABELS[pm] || pm || '—';
    const entrega = tipo === 'delivery' ? ' · Delivery' : tipo === 'local' ? ' · Local' : '';
    return `${metodo}${entrega}`;
}

function nombreArchivo(doc) {
    const serie = (doc.serieCorrelativo || `DOC-${doc.id}`).replace(/[^\w.-]+/g, '_');
    const fecha = String(doc.fecha || '').slice(0, 10).replace(/-/g, '');
    return `factura_${serie}_${fecha || 'sin-fecha'}.pdf`;
}

/**
 * Genera y descarga un PDF con el detalle del documento fiscal.
 * @param {object} doc — mismo formato que getSalesHistory / modal historial
 */
export function descargarDocumentoPdf(doc, opciones = {}) {
    const empresa = opciones.empresaNombre || 'H2O MANAGER';
    const rif = opciones.empresaRif || '';

    const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
    const margen = 14;
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
    pdf.text('Comprobante de venta / factura', margen, y);
    y += 10;

    const correlativo = doc.serieCorrelativo || `DOC-${doc.id}`;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(30, 41, 59);
    pdf.text(String(doc.tipoDoc || 'Documento'), margen, y);
    pdf.text(correlativo, 200, y, { align: 'right' });
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const info = [
        ['Fecha', formatFecha(doc)],
        ['Cliente', doc.cliente || '—'],
        ['Sucursal', doc.sucursal || '—'],
        ['Estado', doc.estado || '—'],
        ['Condiciones de pago', formatCondicionesPago(doc.condicionesPago)],
    ];

    info.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${label}:`, margen, y);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(String(value), 120);
        pdf.text(lines, margen + 38, y);
        y += Math.max(5, lines.length * 4.5);
    });

    y += 4;

    const detalles = Array.isArray(doc.detalles) ? doc.detalles : [];
    const filasTabla = detalles.length
        ? detalles.map((d) => [
              d.nombreItem || `Ítem ${d.itemId}`,
              String(Number(d.cantidad || 0)),
              `$${Number(d.precioUnitario || 0).toFixed(2)}`,
              `$${Number(d.ivaMonto || 0).toFixed(2)}`,
              `$${Number(d.totalLineas || 0).toFixed(2)}`,
          ])
        : [['Sin líneas de detalle registradas', '', '', '', '']];

    autoTable(pdf, {
        startY: y,
        head: [['Descripción', 'Cant.', 'P. unit.', 'IVA', 'Total línea']],
        body: filasTabla,
        margin: { left: margen, right: margen },
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 119, 204], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 75 },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'right', cellWidth: 28 },
            3: { halign: 'right', cellWidth: 24 },
            4: { halign: 'right', cellWidth: 30 },
        },
    });

    y = (pdf.lastAutoTable?.finalY ?? y) + 10;
    const subtotal = Number(doc.subtotal ?? 0);
    const iva = Number(doc.iva ?? 0);
    const total = Number(doc.total ?? 0);
    const anchoLabel = 45;
    const xVal = 200;

    const totales = [
        ['Subtotal', `$${subtotal.toFixed(2)}`],
        ['IVA', `$${iva.toFixed(2)}`],
        ['TOTAL', `$${total.toFixed(2)}`],
    ];

    totales.forEach(([label, valor], i) => {
        const esTotal = i === totales.length - 1;
        pdf.setFont('helvetica', esTotal ? 'bold' : 'normal');
        pdf.setFontSize(esTotal ? 12 : 10);
        pdf.setTextColor(esTotal ? 0 : 60, esTotal ? 119 : 60, esTotal ? 204 : 60);
        pdf.text(label, xVal - anchoLabel, y, { align: 'right' });
        pdf.text(valor, xVal, y, { align: 'right' });
        y += esTotal ? 8 : 6;
    });

    y += 6;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
        `Generado el ${new Date().toLocaleString('es-VE')} — ${empresa}`,
        margen,
        270
    );

    pdf.save(nombreArchivo(doc));
}
