import { useState, useEffect } from 'react';
import {
    FiSearch,
    FiRefreshCw,
    FiClock,
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiHash,
    FiUser,
    FiCalendar,
    FiCreditCard,
    FiDownload,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as ventaService from './services/ventas.service';
import * as configService from './services/config.service';
import { descargarDocumentoPdf } from './utils/factura-pdf';

const TH = 'border-b border-border bg-[#f8fafc] px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted';
const TD = 'border-b border-[#f1f5f9] px-4 py-3.5 align-middle text-text';
const STAT_ICON = {
    blue: 'bg-[#eff6ff] text-[#3b82f6]',
    green: 'bg-[#f0fdf4] text-[#22c55e]',
};

export default function Historial() {
    const [docs, setDocs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('all');
    const [tipoDocFilter, setTipoDocFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const rowsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await ventaService.getSalesHistory();
            setDocs(data || []);
        } catch (err) {
            console.error('Error loading historial:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(String(dateStr || '').replace(' ', 'T'));
        return Number.isNaN(d.getTime())
            ? String(dateStr || '—')
            : d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        const d = new Date(String(dateStr || '').replace(' ', 'T'));
        return Number.isNaN(d.getTime())
            ? '—'
            : d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const filteredDocs = docs.filter((d) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
            !q ||
            String(d.serieCorrelativo || '').toLowerCase().includes(q) ||
            String(d.cliente || '').toLowerCase().includes(q) ||
            String(d.sucursal || '').toLowerCase().includes(q);
        const matchEstado = estadoFilter === 'all' || d.estado === estadoFilter;
        const matchTipo = tipoDocFilter === 'all' || d.tipoDoc === tipoDocFilter;
        return matchSearch && matchEstado && matchTipo;
    });

    const totalPages = Math.ceil(filteredDocs.length / rowsPerPage);
    const paginated = filteredDocs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, estadoFilter, tipoDocFilter]);

    const totalDocs = filteredDocs.length;
    const totalMonto = filteredDocs.reduce((acc, d) => acc + Number(d.total || 0), 0);

    const abrirDetalle = async (doc) => {
        setSelectedDoc(doc);
        if (doc.id && (!doc.detalles || doc.detalles.length === 0)) {
            try {
                const completo = await ventaService.getDocumentoHistorial(doc.id);
                setSelectedDoc(completo);
            } catch (e) {
                console.warn('No se pudo cargar detalle completo:', e);
            }
        }
    };

    const handleDescargarPdf = async () => {
        if (!selectedDoc) return;
        setPdfLoading(true);
        try {
            let doc = selectedDoc;
            if (doc.id && (!doc.detalles || doc.detalles.length === 0)) {
                doc = await ventaService.getDocumentoHistorial(doc.id);
                setSelectedDoc(doc);
            }
            let empresaRif = '';
            try {
                const general = await configService.getGeneralConfig();
                empresaRif = general?.rif || '';
            } catch {
                /* opcional */
            }
            descargarDocumentoPdf(doc, { empresaNombre: 'H2O MANAGER', empresaRif });
        } catch (e) {
            Swal.fire('Error', e?.message || 'No se pudo generar el PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="animate-fade-up p-2.5">
            <div className="mb-7 flex items-start justify-between max-md:flex-col max-md:gap-4">
                <div>
                    <h1 className="font-display text-[28px] text-text">Historial de Documentos</h1>
                </div>
                <button
                    className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-5 py-2.5 text-[13px] font-semibold text-text transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                    onClick={loadData}
                    disabled={isLoading}
                >
                    <FiRefreshCw className={isLoading ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                <div className="flex items-center gap-3.5 rounded-[14px] border border-border bg-surface px-[22px] py-5 transition hover:-translate-y-[3px]">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${STAT_ICON.blue}`}><FiHash /></div>
                    <div>
                        <p className="font-display text-[22px] leading-none text-text">{totalDocs}</p>
                        <p className="mt-1 text-xs font-medium text-muted">Documentos</p>
                    </div>
                </div>
                <div className="flex items-center gap-3.5 rounded-[14px] border border-border bg-surface px-[22px] py-5 transition hover:-translate-y-[3px]">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${STAT_ICON.green}`}><FiCreditCard /></div>
                    <div>
                        <p className="font-display text-[22px] leading-none text-text">${totalMonto.toFixed(2)}</p>
                        <p className="mt-1 text-xs font-medium text-muted">Total</p>
                    </div>
                </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3 max-md:flex-col">
                <div className="relative min-w-[240px] flex-1 max-md:w-full">
                    <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-muted" />
                    <input
                        type="text"
                        className="w-full rounded-[10px] border border-border bg-surface py-2.5 pl-10 pr-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/[0.08]"
                        placeholder="Buscar por correlativo, cliente o sucursal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="min-w-[130px] cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-accent max-md:w-full"
                    value={tipoDocFilter}
                    onChange={(e) => setTipoDocFilter(e.target.value)}
                >
                    <option value="all">Todos los tipos</option>
                    <option value="Factura">Factura</option>
                    <option value="Nota de Crédito">Nota de Crédito</option>
                </select>
                <select
                    className="min-w-[130px] cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-2.5 text-[13px] text-text outline-none focus:border-accent max-md:w-full"
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                >
                    <option value="all">Todos los estados</option>
                    {[...new Set(docs.map((d) => d.estado).filter(Boolean))].map((estado) => (
                        <option key={estado} value={estado}>{estado}</option>
                    ))}
                </select>
            </div>

            <div className="mb-5 overflow-hidden rounded-[14px] border border-border bg-surface max-md:overflow-x-auto">
                {filteredDocs.length === 0 ? (
                    <div className="px-5 py-[60px] text-center text-muted">
                        <div className="mb-3 text-5xl opacity-40"><FiClock className="mx-auto" /></div>
                        <h3 className="mb-2 text-lg text-text">{isLoading ? 'Cargando...' : 'Sin documentos'}</h3>
                        <p className="text-sm">{isLoading ? 'Obteniendo datos de la API' : 'No hay datos para los filtros aplicados'}</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className={TH}>Correlativo</th>
                                    <th className={TH}>Fecha</th>
                                    <th className={TH}>Cliente</th>
                                    <th className={TH}>Sucursal</th>
                                    <th className={TH}>Tipo</th>
                                    <th className={TH}>Estado</th>
                                    <th className={`${TH} text-right`}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        className="cursor-pointer transition last:[&>td]:border-b-0 hover:bg-[#f8fafc]"
                                        onClick={() => abrirDetalle(doc)}
                                    >
                                        <td className={TD}>
                                            <span className="inline-block rounded-md bg-[#eff6ff] px-2.5 py-1 font-mono text-[13px] font-bold text-accent">
                                                {doc.serieCorrelativo || `DOC-${doc.id}`}
                                            </span>
                                        </td>
                                        <td className={TD}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[13px] font-semibold text-text">{formatDate(doc.fecha)}</span>
                                                <span className="text-[11px] text-muted">{formatTime(doc.fecha)}</span>
                                            </div>
                                        </td>
                                        <td className={TD}>{doc.cliente || '—'}</td>
                                        <td className={TD}>{doc.sucursal || '—'}</td>
                                        <td className={TD}>{doc.tipoDoc || '—'}</td>
                                        <td className={TD}>{doc.estado || '—'}</td>
                                        <td className={`${TD} text-right font-semibold`}>{Number(doc.total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex items-center justify-between border-t border-border px-4 py-3.5 text-[13px] text-muted">
                            <span className="font-medium">
                                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredDocs.length)} de {filteredDocs.length}
                            </span>
                            <div className="flex gap-1.5">
                                <button
                                    className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <FiChevronLeft />
                                </button>
                                <button
                                    className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    <FiChevronRight />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedDoc && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px]"
                    onClick={() => setSelectedDoc(null)}
                >
                    <div
                        className="animate-fade-up max-h-[85vh] w-[560px] max-w-[92vw] overflow-y-auto rounded-[18px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] px-7 pb-4 pt-6">
                            <h2 className="font-display text-xl text-text">Detalle de Documento</h2>
                            <div className="flex flex-shrink-0 items-center gap-2.5">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-accent bg-white px-3.5 py-2 text-[13px] font-semibold text-accent transition enabled:hover:bg-accent enabled:hover:text-white disabled:cursor-wait disabled:opacity-65"
                                    onClick={handleDescargarPdf}
                                    disabled={pdfLoading}
                                    title="Descargar PDF"
                                >
                                    <FiDownload className={pdfLoading ? 'animate-spin' : ''} />
                                    {pdfLoading ? 'Generando…' : 'Descargar PDF'}
                                </button>
                                <button
                                    type="button"
                                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-lg text-muted transition hover:border-[#ef4444] hover:text-[#ef4444]"
                                    onClick={() => setSelectedDoc(null)}
                                    aria-label="Cerrar"
                                >
                                    <FiX />
                                </button>
                            </div>
                        </div>
                        <div className="px-7 pb-7 pt-5">
                            <div className="mb-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted"><FiHash className="inline align-middle" /> Correlativo</span>
                                    <span className="text-sm font-semibold text-text">{selectedDoc.serieCorrelativo || `DOC-${selectedDoc.id}`}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted"><FiCalendar className="inline align-middle" /> Fecha</span>
                                    <span className="text-sm font-semibold text-text">{formatDate(selectedDoc.fecha)} — {formatTime(selectedDoc.fecha)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted"><FiUser className="inline align-middle" /> Cliente</span>
                                    <span className="text-sm font-semibold text-text">{selectedDoc.cliente || '—'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sucursal</span>
                                    <span className="text-sm font-semibold text-text">{selectedDoc.sucursal || '—'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tipo</span>
                                    <span className="text-sm font-semibold text-text">{selectedDoc.tipoDoc || '—'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Condiciones de pago</span>
                                    <span className="text-sm font-semibold text-text">{selectedDoc.condicionesPago || '—'}</span>
                                </div>
                            </div>

                            <h4 className="mb-2.5 text-[13px] uppercase tracking-wide text-muted">
                                Líneas de detalle ({selectedDoc.detalles?.length || 0})
                            </h4>
                            <div className="overflow-hidden rounded-[10px] border border-border">
                                <table className="mt-0 w-full border-collapse text-[13px]">
                                    <thead>
                                        <tr>
                                            <th className="border-b border-border bg-[#f8fafc] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Item</th>
                                            <th className="border-b border-border bg-[#f8fafc] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Cant.</th>
                                            <th className="border-b border-border bg-[#f8fafc] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">P. Unit</th>
                                            <th className="border-b border-border bg-[#f8fafc] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">IVA</th>
                                            <th className="border-b border-border bg-[#f8fafc] px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">Total Línea</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedDoc.detalles || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-2.5 text-center text-muted">
                                                    Sin líneas de detalle en la respuesta de la API.
                                                </td>
                                            </tr>
                                        )}
                                        {(selectedDoc.detalles || []).map((d) => (
                                            <tr key={d.id}>
                                                <td className="border-b border-[#f1f5f9] px-3 py-2.5 text-text">{d.nombreItem || `Item ${d.itemId}`}</td>
                                                <td className="border-b border-[#f1f5f9] px-3 py-2.5 text-text">{Number(d.cantidad || 0)}</td>
                                                <td className="border-b border-[#f1f5f9] px-3 py-2.5 text-right text-text">{Number(d.precioUnitario || 0).toFixed(2)}</td>
                                                <td className="border-b border-[#f1f5f9] px-3 py-2.5 text-right text-text">{Number(d.ivaMonto || 0).toFixed(2)}</td>
                                                <td className="border-b border-[#f1f5f9] px-3 py-2.5 text-right font-semibold text-text">{Number(d.totalLineas || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 rounded-xl border border-border bg-[#f8fafc] p-4">
                                <div className="flex justify-between py-1 text-sm text-text">
                                    <span>Subtotal</span>
                                    <span>{Number(selectedDoc.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 text-sm text-text">
                                    <span>IVA</span>
                                    <span>{Number(selectedDoc.iva || 0).toFixed(2)}</span>
                                </div>
                                <div className="mt-2 flex justify-between border-t-2 border-dashed border-border pt-2.5 text-lg font-extrabold text-text">
                                    <span>Total</span>
                                    <span>{Number(selectedDoc.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
