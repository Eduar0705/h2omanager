import { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiUsers, FiTruck,
    FiDownload, FiFileText, FiRefreshCw,
    FiTrendingUp, FiBarChart2, FiSearch,
} from 'react-icons/fi';
import { TbBottle } from 'react-icons/tb';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import Swal from 'sweetalert2';
import { useAuth } from '../auth/AuthContext';
import * as ventaService from './services/ventas.service';
import * as clientService from './services/clientes.service';
import * as botellonService from './services/botellones.service';
import * as reportesApi from './services/reportes.service';
import * as configService from './services/config.service';
import { descargarInformeGerencialPdf } from './utils/informe-gerencial-pdf';
import '../assets/css/reportes.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#06b6d4'];
const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

function hoyIso() {
    return new Date().toISOString().slice(0, 10);
}

function inicioMesIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatCelda(key, value) {
    if (value == null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (key === 'signo') return Number(value) > 0 ? 'Entrada' : 'Salida';
    if (['subtotal', 'iva', 'total', 'saldo', 'precioSugerido', 'valorEstimado', 'limiteCredito'].includes(key)) {
        return `$${Number(value).toFixed(2)}`;
    }
    if (key === 'stock' || key === 'cantidad' || key === 'stockMinimo') {
        return Number(value).toLocaleString();
    }
    return String(value);
}

export default function Reportes() {
    const { user } = useAuth();
    const sucursalId = Number(user?.sucursalId ?? DEFAULT_SUCURSAL_ID);

    const [sales, setSales] = useState([]);
    const [clients, setClients] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [tipoInforme, setTipoInforme] = useState('ventas');
    const [fechaDesde, setFechaDesde] = useState(inicioMesIso());
    const [fechaHasta, setFechaHasta] = useState(hoyIso());
    const [informe, setInforme] = useState(null);
    const [generando, setGenerando] = useState(false);
    const [pdfInformeLoading, setPdfInformeLoading] = useState(false);

    const tipoConfig = reportesApi.TIPOS_INFORME.find((t) => t.id === tipoInforme);

    useEffect(() => {
        loadData();
    }, [sucursalId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [s, c, hist] = await Promise.all([
                ventaService.getSales(),
                clientService.getClients(),
                botellonService.getHistory(sucursalId),
            ]);
            setSales(s || []);
            setClients(c || []);
            setHistory(hist || []);
        } catch (e) {
            console.error('Error loading report data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const totalUSD = sales.reduce((a, s) => a + (s.totalUSD || 0), 0);
    const totalBottlesDelivered = history
        .filter((m) => m.esEntrada === false || Number(m.signo) < 0)
        .reduce((a, m) => a + Number(m.cantidad || 0), 0);
    const morosos = clients.filter(
        (c) => c.status === 'delinquent' || c.status === 'overlimit'
    ).length;
    const ventasCredito = sales.filter((s) => s.paymentMethod === 'credito').length;

    const monthlySales = useMemo(() => {
        const data = MONTHS.map((name) => ({ name, ventas: 0 }));
        sales.forEach((s) => {
            if (!s.date) return;
            const d = new Date(s.date);
            data[d.getMonth()].ventas += s.totalUSD || 0;
        });
        return data.map((d) => ({ ...d, ventas: Math.round(d.ventas * 100) / 100 }));
    }, [sales]);

    const topClients = useMemo(() => {
        const map = {};
        sales.forEach((s) => {
            const name = s.client?.name || 'Desconocido';
            const qty = (s.items || []).reduce((a, i) => a + (i.qty || 0), 0);
            map[name] = (map[name] || 0) + qty;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({
                name: name.length > 12 ? `${name.slice(0, 12)}…` : name,
                botellones: qty,
            }));
    }, [sales]);

    const serviceTypes = useMemo(() => {
        const payMap = {};
        sales.forEach((s) => {
            const m = s.paymentMethod || 'otro';
            payMap[m] = (payMap[m] || 0) + 1;
        });
        const PAY_LABELS = {
            efectivo_usd: 'Efectivo USD',
            efectivo_ves: 'Efectivo Bs',
            pago_movil: 'Pago Móvil',
            transferencia: 'Transferencia',
            punto: 'Punto de Venta',
            credito: 'Crédito',
            mixto: 'Pago Mixto',
            otro: 'Otro',
        };
        return Object.entries(payMap)
            .sort((a, b) => b[1] - a[1])
            .map(([key, value]) => ({ name: PAY_LABELS[key] || key, value }));
    }, [sales]);

    const donutTotal = serviceTypes.reduce((a, s) => a + s.value, 0);

    const exportVentasCsv = () => {
        const header = 'ID,Fecha,Cliente,Tipo,Método,Total USD\n';
        const rows = sales
            .map(
                (s) =>
                    `${s.id},${s.date},${s.client?.name || ''},${s.type},${s.paymentMethod},${s.totalUSD || 0}`
            )
            .join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumen_ventas_${hoyIso()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const generarInforme = async () => {
        if (tipoConfig?.requiereFechas && (!fechaDesde || !fechaHasta)) {
            Swal.fire('Validación', 'Indique el rango de fechas del informe.', 'warning');
            return;
        }
        setGenerando(true);
        try {
            const data = await reportesApi.generarInforme({
                tipo: tipoInforme,
                sucursalId,
                fechaDesde: tipoConfig?.requiereFechas ? fechaDesde : undefined,
                fechaHasta: tipoConfig?.requiereFechas ? fechaHasta : undefined,
            });
            setInforme(data);
        } catch (e) {
            Swal.fire('Error', e.message || 'No se pudo generar el informe', 'error');
        } finally {
            setGenerando(false);
        }
    };

    const exportInformeCsv = () => {
        if (!informe) return;
        const csv = reportesApi.informeToCsv(informe);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_${informe.tipo}_${hoyIso()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const descargarInformePdf = async () => {
        if (!informe) return;
        setPdfInformeLoading(true);
        try {
            let empresaRif = '';
            try {
                const general = await configService.getGeneralConfig();
                empresaRif = general?.rif || '';
            } catch {
                /* opcional */
            }
            descargarInformeGerencialPdf(informe, {
                empresaNombre: 'H2O MANAGER',
                empresaRif,
                sucursalId,
            });
        } catch (e) {
            Swal.fire('Error', e?.message || 'No se pudo generar el PDF', 'error');
        } finally {
            setPdfInformeLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '13px',
                    }}
                >
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--accent)', fontWeight: 600 }}>
                        ${payload[0].value.toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderTotalesInforme = () => {
        if (!informe?.totales) return null;
        return (
            <div className="rep-preview-totales">
                {Object.entries(informe.totales).map(([k, v]) => (
                    <span key={k}>
                        <strong>{k.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                        {typeof v === 'number' && (k.includes('total') || k.includes('saldo') || k.includes('valor') || k.includes('Usd'))
                            ? `$${Number(v).toFixed(2)}`
                            : v}
                    </span>
                ))}
            </div>
        );
    };

    const renderTablaInforme = () => {
        if (informe?.tipo === 'estado_resultados' && (informe.ingresos || informe.egresos)) {
            const tablaCuentas = (titulo, filas) => (
                <div key={titulo} className="rep-contable-seccion">
                    <h4>{titulo}</h4>
                    <div className="rep-table-wrap">
                        <table className="rep-data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cuenta</th>
                                    <th className="text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filas || []).length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                                            Sin movimientos
                                        </td>
                                    </tr>
                                )}
                                {(filas || []).map((c, i) => (
                                    <tr key={c.cuentaId ?? i}>
                                        <td>{c.codigo}</td>
                                        <td>{c.nombre}</td>
                                        <td className="text-right">${Number(c.saldo ?? 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            return (
                <>
                    {informe.nota && (
                        <p className="mod-form-hint" style={{ marginBottom: 12 }}>{informe.nota}</p>
                    )}
                    {tablaCuentas('Ingresos', informe.ingresos)}
                    {tablaCuentas('Egresos', informe.egresos)}
                </>
            );
        }

        if (informe?.secciones?.length) {
            return informe.secciones.map((sec, idx) => (
                <div key={idx} className="rep-contable-seccion">
                    <h4>
                        {sec.titulo || sec.tipo} — Subtotal: $
                        {Number(sec.subtotal ?? 0).toFixed(2)}
                    </h4>
                    <div className="rep-table-wrap">
                        <table className="rep-data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cuenta</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sec.cuentas || []).map((c, i) => (
                                    <tr key={i}>
                                        <td>{c.codigo}</td>
                                        <td>{c.nombre}</td>
                                        <td>${Number(c.saldo ?? 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ));
        }

        if (!informe?.filas?.length) {
            return (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                    Sin registros para los filtros seleccionados.
                </p>
            );
        }

        const cols = informe.columnas?.length
            ? informe.columnas
            : Object.keys(informe.filas[0]);

        return (
            <div className="rep-table-wrap">
                <table className="rep-data-table">
                    <thead>
                        <tr>
                            {cols.map((c) => (
                                <th key={c}>{reportesApi.labelColumna(c)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {informe.filas.map((fila, i) => (
                            <tr key={i}>
                                {cols.map((c) => (
                                    <td key={c}>{formatCelda(c, fila[c])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="reportes-container">
            <div className="reportes-header">
                <div className="title-section">
                    <h1>Reportes y Analítica</h1>
                    <p>Resumen del negocio e informes gerenciales exportables</p>
                </div>
                <div className="rep-header-actions">
                    <button className="btn-rep" onClick={loadData} disabled={isLoading}>
                        <FiRefreshCw className={isLoading ? 'spin' : ''} />
                    </button>
                    <button className="btn-rep" onClick={exportVentasCsv}>
                        <FiDownload /> Resumen ventas CSV
                    </button>
                </div>
            </div>

            <h2 className="rep-section-title">
                <FiBarChart2 style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Resumen analítico
            </h2>

            <div className="rep-stats">
                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Ventas registradas</p>
                        <p className="rep-stat-value">
                            ${totalUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <div className="rep-stat-trend up">
                            <FiTrendingUp size={14} /> {sales.length} documentos
                        </div>
                    </div>
                    <div className="rep-stat-icon blue">
                        <FiDollarSign />
                    </div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Salidas de inventario</p>
                        <p className="rep-stat-value">{totalBottlesDelivered.toLocaleString()}</p>
                        <div className="rep-stat-trend up">
                            <FiTrendingUp size={14} /> unidades (histórico)
                        </div>
                    </div>
                    <div className="rep-stat-icon cyan">
                        <TbBottle />
                    </div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Clientes en cartera</p>
                        <p className="rep-stat-value">{clients.length}</p>
                        <div className="rep-stat-trend down">
                            {morosos} con saldo pendiente
                        </div>
                    </div>
                    <div className="rep-stat-icon orange">
                        <FiUsers />
                    </div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Ventas a crédito</p>
                        <p className="rep-stat-value">{ventasCredito}</p>
                        <div className="rep-stat-trend up">
                            <FiTruck size={14} /> del total de ventas
                        </div>
                    </div>
                    <div className="rep-stat-icon green">
                        <FiTruck />
                    </div>
                </div>
            </div>

            <div className="rep-chart-card">
                <div className="rep-chart-header">
                    <h3>Ventas mensuales (USD)</h3>
                    <span className="rep-period-btn">Datos del sistema</span>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={monthlySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="ventas"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="rep-bottom-grid">
                <div className="rep-chart-card">
                    <div className="rep-chart-header">
                        <h3>Top clientes (unidades vendidas)</h3>
                    </div>
                    {topClients.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topClients} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                    }}
                                    formatter={(v) => [`${v} unidades`, 'Cantidad']}
                                />
                                <Bar dataKey="botellones" radius={[6, 6, 0, 0]} maxBarSize={40} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                            Sin datos de clientes aún
                        </div>
                    )}
                </div>

                <div className="rep-chart-card">
                    <div className="rep-chart-header">
                        <h3>Formas de pago</h3>
                    </div>
                    {serviceTypes.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <ResponsiveContainer width="50%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={serviceTypes}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {serviceTypes.map((_, i) => (
                                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                        }}
                                        formatter={(v) => [`${v} ventas`, 'Cantidad']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-legend" style={{ flex: 1 }}>
                                {serviceTypes.map((s, i) => (
                                    <div key={s.name} className="donut-legend-item">
                                        <div
                                            className="donut-legend-dot"
                                            style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                                        />
                                        <span className="donut-legend-label">{s.name}</span>
                                        <span className="donut-legend-val">
                                            {donutTotal > 0 ? Math.round((s.value / donutTotal) * 100) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                            Sin datos de ventas aún
                        </div>
                    )}
                </div>
            </div>

            <h2 className="rep-section-title">
                <FiFileText style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Informes gerenciales
            </h2>

            <div className="rep-gerencial-panel" id="informe-gerencial-print">
                <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 14 }}>
                    Genere informes detallados por período o posición contable. Exporte a CSV o descargue un PDF gerencial con el mismo formato que las facturas.
                </p>

                <div className="rep-gerencial-form">
                    <label>
                        Tipo de informe
                        <select value={tipoInforme} onChange={(e) => setTipoInforme(e.target.value)}>
                            {reportesApi.TIPOS_INFORME.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    {tipoConfig?.requiereFechas && (
                        <>
                            <label>
                                Desde
                                <input
                                    type="date"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                            </label>
                            <label>
                                Hasta
                                <input
                                    type="date"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                            </label>
                        </>
                    )}
                    <label>
                        Sucursal
                        <input type="number" value={sucursalId} readOnly />
                    </label>
                </div>

                <div className="rep-gerencial-actions">
                    <button className="btn-rep primary" onClick={generarInforme} disabled={generando}>
                        <FiSearch className={generando ? 'spin' : ''} />
                        {generando ? 'Generando…' : 'Generar informe'}
                    </button>
                    {informe && (
                        <>
                            <button className="btn-rep" onClick={exportInformeCsv}>
                                <FiDownload /> Exportar CSV
                            </button>
                            <button
                                className="btn-rep primary"
                                onClick={descargarInformePdf}
                                disabled={pdfInformeLoading}
                            >
                                <FiFileText className={pdfInformeLoading ? 'spin' : ''} />
                                {pdfInformeLoading ? 'Generando PDF…' : 'Descargar PDF'}
                            </button>
                        </>
                    )}
                </div>

                {informe && (
                    <div className="rep-preview">
                        <h3 style={{ margin: '0 0 12px' }}>{informe.titulo}</h3>
                        {informe.periodo && (
                            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 12px' }}>
                                Período: {informe.periodo.desde || '—'} al {informe.periodo.hasta || '—'}
                            </p>
                        )}
                        {renderTotalesInforme()}
                        {renderTablaInforme()}
                        {informe.tipo === 'clientes_cxc' && informe.cxcDocumentos?.length > 0 && (
                            <>
                                <h4 style={{ marginTop: 20 }}>Documentos CXC pendientes</h4>
                                <div className="rep-table-wrap">
                                    <table className="rep-data-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Documento</th>
                                                <th>Vencimiento</th>
                                                <th>Saldo</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {informe.cxcDocumentos.map((cx, i) => (
                                                <tr key={i}>
                                                    <td>{cx.cliente}</td>
                                                    <td>{cx.serieCorrelativo || '—'}</td>
                                                    <td>{cx.vencimiento}</td>
                                                    <td>${Number(cx.saldo).toFixed(2)}</td>
                                                    <td>{cx.estado}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
