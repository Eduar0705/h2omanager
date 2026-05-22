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
import '../assets/css/historial.css';

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
            descargarDocumentoPdf(doc, {
                empresaNombre: 'H2O MANAGER',
                empresaRif,
            });
        } catch (e) {
            Swal.fire('Error', e?.message || 'No se pudo generar el PDF', 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <div className="historial-container">
            <div className="historial-header">
                <div className="title-section">
                    <h1>Historial de Documentos</h1>
                </div>
                <button className="btn-refresh" onClick={loadData} disabled={isLoading}>
                    <FiRefreshCw className={isLoading ? 'spin' : ''} /> Actualizar
                </button>
            </div>

            <div className="historial-stats">
                <div className="hist-stat">
                    <div className="hist-stat-icon blue"><FiHash /></div>
                    <div className="hist-stat-info">
                        <p className="stat-value">{totalDocs}</p>
                        <p className="stat-label">Documentos</p>
                    </div>
                </div>
                <div className="hist-stat">
                    <div className="hist-stat-icon green"><FiCreditCard /></div>
                    <div className="hist-stat-info">
                        <p className="stat-value">${totalMonto.toFixed(2)}</p>
                        <p className="stat-label">Total</p>
                    </div>
                </div>
            </div>

            <div className="historial-controls">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar por correlativo, cliente o sucursal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select className="filter-select" value={tipoDocFilter} onChange={(e) => setTipoDocFilter(e.target.value)}>
                    <option value="all">Todos los tipos</option>
                    <option value="Factura">Factura</option>
                    <option value="Nota de Crédito">Nota de Crédito</option>
                </select>
                <select className="filter-select" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    {[...new Set(docs.map((d) => d.estado).filter(Boolean))].map((estado) => (
                        <option key={estado} value={estado}>{estado}</option>
                    ))}
                </select>
            </div>

            <div className="historial-table-wrap">
                {filteredDocs.length === 0 ? (
                    <div className="hist-empty">
                        <div className="hist-empty-icon"><FiClock /></div>
                        <h3>{isLoading ? 'Cargando...' : 'Sin documentos'}</h3>
                        <p>{isLoading ? 'Obteniendo datos de la API' : 'No hay datos para los filtros aplicados'}</p>
                    </div>
                ) : (
                    <>
                        <table className="historial-table">
                            <thead>
                                <tr>
                                    <th>Correlativo</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Sucursal</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((doc) => (
                                    <tr key={doc.id} onClick={() => abrirDetalle(doc)}>
                                        <td><span className="sale-id-chip">{doc.serieCorrelativo || `DOC-${doc.id}`}</span></td>
                                        <td>
                                            <div className="sale-date">
                                                <span className="day">{formatDate(doc.fecha)}</span>
                                                <span className="time">{formatTime(doc.fecha)}</span>
                                            </div>
                                        </td>
                                        <td>{doc.cliente || '—'}</td>
                                        <td>{doc.sucursal || '—'}</td>
                                        <td>{doc.tipoDoc || '—'}</td>
                                        <td>{doc.estado || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(doc.total || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="historial-pagination">
                            <span className="page-info">
                                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredDocs.length)} de {filteredDocs.length}
                            </span>
                            <div className="page-btns">
                                <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                                    <FiChevronLeft />
                                </button>
                                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                                    <FiChevronRight />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedDoc && (
                <div className="hist-modal-overlay" onClick={() => setSelectedDoc(null)}>
                    <div className="hist-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="hist-modal-header">
                            <h2>Detalle de Documento</h2>
                            <div className="hist-modal-actions">
                                <button
                                    type="button"
                                    className="btn-hist-pdf"
                                    onClick={handleDescargarPdf}
                                    disabled={pdfLoading}
                                    title="Descargar PDF"
                                >
                                    <FiDownload className={pdfLoading ? 'spin' : ''} />
                                    {pdfLoading ? 'Generando…' : 'Descargar PDF'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setSelectedDoc(null)}
                                    aria-label="Cerrar"
                                >
                                    <FiX />
                                </button>
                            </div>
                        </div>
                        <div className="hist-modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label"><FiHash style={{ verticalAlign: 'middle' }} /> Correlativo</span>
                                    <span className="detail-value">{selectedDoc.serieCorrelativo || `DOC-${selectedDoc.id}`}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiCalendar style={{ verticalAlign: 'middle' }} /> Fecha</span>
                                    <span className="detail-value">{formatDate(selectedDoc.fecha)} — {formatTime(selectedDoc.fecha)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiUser style={{ verticalAlign: 'middle' }} /> Cliente</span>
                                    <span className="detail-value">{selectedDoc.cliente || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Sucursal</span>
                                    <span className="detail-value">{selectedDoc.sucursal || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Tipo</span>
                                    <span className="detail-value">{selectedDoc.tipoDoc || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Condiciones de pago</span>
                                    <span className="detail-value">{selectedDoc.condicionesPago || '—'}</span>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '13px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.3px', margin: '0 0 10px' }}>
                                Líneas de detalle ({selectedDoc.detalles?.length || 0})
                            </h4>
                            <div style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <table className="detail-items-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Cant.</th>
                                            <th className="text-right">P. Unit</th>
                                            <th className="text-right">IVA</th>
                                            <th className="text-right">Total Línea</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedDoc.detalles || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                                                    Sin líneas de detalle en la respuesta de la API.
                                                </td>
                                            </tr>
                                        )}
                                        {(selectedDoc.detalles || []).map((d) => (
                                            <tr key={d.id}>
                                                <td>{d.nombreItem || `Item ${d.itemId}`}</td>
                                                <td>{Number(d.cantidad || 0)}</td>
                                                <td className="text-right">{Number(d.precioUnitario || 0).toFixed(2)}</td>
                                                <td className="text-right">{Number(d.ivaMonto || 0).toFixed(2)}</td>
                                                <td className="text-right" style={{ fontWeight: 600 }}>{Number(d.totalLineas || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="detail-totals">
                                <div className="total-row">
                                    <span>Subtotal</span>
                                    <span>{Number(selectedDoc.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>IVA</span>
                                    <span>{Number(selectedDoc.iva || 0).toFixed(2)}</span>
                                </div>
                                <div className="total-row grand">
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
