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

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#06b6d4'];
const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const BTN_REP = 'flex items-center gap-2 rounded-[10px] border border-border bg-white px-5 py-2.5 text-[13px] font-semibold text-text transition hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] disabled:opacity-60 max-md:flex-1 max-md:justify-center';
const BTN_REP_PRIMARY = 'flex items-center gap-2 rounded-[10px] border border-accent bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,119,204,0.25)] transition hover:bg-[#0066b3] disabled:opacity-60';
const CARD = 'mb-5 rounded-2xl border border-border bg-white p-6 transition hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]';
const SECTION_TITLE = 'mb-4 mt-8 flex items-center border-b-2 border-border pb-2 font-display text-xl text-text';
const STAT_ICON = {
    blue: 'bg-[#eff6ff] text-[#3b82f6]',
    cyan: 'bg-[#ecfeff] text-[#06b6d4]',
    orange: 'bg-[#fff7ed] text-[#f97316]',
    green: 'bg-[#f0fdf4] text-[#22c55e]',
};
const FORM_LABEL = 'flex flex-col gap-1.5 text-xs font-semibold text-muted';
const FORM_INPUT = 'rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-accent';
const TABLE_WRAP = 'max-h-[420px] overflow-x-auto rounded-[10px] border border-border';
const DATA_TABLE = 'w-full border-collapse text-[13px]';
const DT_TH = 'sticky top-0 border-b border-[#f1f5f9] bg-[#f8fafc] px-3 py-2.5 text-left font-semibold';
const DT_TD = 'border-b border-[#f1f5f9] px-3 py-2.5 text-left';

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
                <div className="rounded-[10px] border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-[13px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                    <p className="m-0 font-bold text-text">{label}</p>
                    <p className="mt-1 font-semibold text-accent">${payload[0].value.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

    const renderTotalesInforme = () => {
        if (!informe?.totales) return null;
        return (
            <div className="mb-3.5 flex flex-wrap gap-4 text-[13px]">
                {Object.entries(informe.totales).map(([k, v]) => (
                    <span key={k} className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
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
                <div key={titulo} className="mb-4">
                    <h4 className="mb-2 text-[15px]">{titulo}</h4>
                    <div className={TABLE_WRAP}>
                        <table className={DATA_TABLE}>
                            <thead>
                                <tr>
                                    <th className={DT_TH}>Código</th>
                                    <th className={DT_TH}>Cuenta</th>
                                    <th className={`${DT_TH} text-right`}>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filas || []).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className={`${DT_TD} text-center text-muted`}>
                                            Sin movimientos
                                        </td>
                                    </tr>
                                )}
                                {(filas || []).map((c, i) => (
                                    <tr key={c.cuentaId ?? i}>
                                        <td className={DT_TD}>{c.codigo}</td>
                                        <td className={DT_TD}>{c.nombre}</td>
                                        <td className={`${DT_TD} text-right`}>${Number(c.saldo ?? 0).toFixed(2)}</td>
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
                        <p className="mb-3 mt-1 text-xs text-[#94a3b8]">{informe.nota}</p>
                    )}
                    {tablaCuentas('Ingresos', informe.ingresos)}
                    {tablaCuentas('Egresos', informe.egresos)}
                </>
            );
        }

        if (informe?.secciones?.length) {
            return informe.secciones.map((sec, idx) => (
                <div key={idx} className="mb-4">
                    <h4 className="mb-2 text-[15px]">
                        {sec.titulo || sec.tipo} — Subtotal: $
                        {Number(sec.subtotal ?? 0).toFixed(2)}
                    </h4>
                    <div className={TABLE_WRAP}>
                        <table className={DATA_TABLE}>
                            <thead>
                                <tr>
                                    <th className={DT_TH}>Código</th>
                                    <th className={DT_TH}>Cuenta</th>
                                    <th className={DT_TH}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sec.cuentas || []).map((c, i) => (
                                    <tr key={i}>
                                        <td className={DT_TD}>{c.codigo}</td>
                                        <td className={DT_TD}>{c.nombre}</td>
                                        <td className={DT_TD}>${Number(c.saldo ?? 0).toFixed(2)}</td>
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
                <p className="text-sm text-muted">
                    Sin registros para los filtros seleccionados.
                </p>
            );
        }

        const cols = informe.columnas?.length
            ? informe.columnas
            : Object.keys(informe.filas[0]);

        return (
            <div className={TABLE_WRAP}>
                <table className={DATA_TABLE}>
                    <thead>
                        <tr>
                            {cols.map((c) => (
                                <th key={c} className={DT_TH}>{reportesApi.labelColumna(c)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {informe.filas.map((fila, i) => (
                            <tr key={i}>
                                {cols.map((c) => (
                                    <td key={c} className={DT_TD}>{formatCelda(c, fila[c])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="animate-fade-up p-2.5">
            <div className="mb-7 flex items-start justify-between max-md:flex-col max-md:gap-4">
                <div>
                    <h1 className="font-display text-[28px] text-text">Reportes y Analítica</h1>
                    <p className="mt-1 text-sm text-muted">Resumen del negocio e informes gerenciales exportables</p>
                </div>
                <div className="flex gap-2.5 max-md:w-full">
                    <button className={BTN_REP} onClick={loadData} disabled={isLoading}>
                        <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button className={BTN_REP} onClick={exportVentasCsv}>
                        <FiDownload /> Resumen ventas CSV
                    </button>
                </div>
            </div>

            <h2 className={SECTION_TITLE}>
                <FiBarChart2 className="mr-2 align-middle" />
                Resumen analítico
            </h2>

            <div className="mb-7 grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[480px]:grid-cols-1">
                <div className="flex items-start justify-between rounded-2xl border border-border bg-white px-6 py-[22px] transition hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                    <div>
                        <p className="mb-2 text-[13px] font-medium text-muted">Ventas registradas</p>
                        <p className="mb-2 font-display text-3xl font-extrabold leading-none text-text">
                            ${totalUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#22c55e]">
                            <FiTrendingUp size={14} /> {sales.length} documentos
                        </div>
                    </div>
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${STAT_ICON.blue}`}>
                        <FiDollarSign />
                    </div>
                </div>

                <div className="flex items-start justify-between rounded-2xl border border-border bg-white px-6 py-[22px] transition hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                    <div>
                        <p className="mb-2 text-[13px] font-medium text-muted">Salidas de inventario</p>
                        <p className="mb-2 font-display text-3xl font-extrabold leading-none text-text">{totalBottlesDelivered.toLocaleString()}</p>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#22c55e]">
                            <FiTrendingUp size={14} /> unidades (histórico)
                        </div>
                    </div>
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${STAT_ICON.cyan}`}>
                        <TbBottle />
                    </div>
                </div>

                <div className="flex items-start justify-between rounded-2xl border border-border bg-white px-6 py-[22px] transition hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                    <div>
                        <p className="mb-2 text-[13px] font-medium text-muted">Clientes en cartera</p>
                        <p className="mb-2 font-display text-3xl font-extrabold leading-none text-text">{clients.length}</p>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#ef4444]">
                            {morosos} con saldo pendiente
                        </div>
                    </div>
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${STAT_ICON.orange}`}>
                        <FiUsers />
                    </div>
                </div>

                <div className="flex items-start justify-between rounded-2xl border border-border bg-white px-6 py-[22px] transition hover:-translate-y-[3px] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                    <div>
                        <p className="mb-2 text-[13px] font-medium text-muted">Ventas a crédito</p>
                        <p className="mb-2 font-display text-3xl font-extrabold leading-none text-text">{ventasCredito}</p>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#22c55e]">
                            <FiTruck size={14} /> del total de ventas
                        </div>
                    </div>
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${STAT_ICON.green}`}>
                        <FiTruck />
                    </div>
                </div>
            </div>

            <div className={CARD}>
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="font-display text-lg text-text">Ventas mensuales (USD)</h3>
                    <span className="cursor-pointer rounded-lg border border-border bg-white px-4 py-1.5 text-[13px] font-medium text-text transition hover:border-accent">Datos del sistema</span>
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

            <div className="mb-5 grid grid-cols-2 gap-5 max-[1024px]:grid-cols-1">
                <div className={CARD.replace('mb-5 ', '')}>
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-display text-lg text-text">Top clientes (unidades vendidas)</h3>
                    </div>
                    {topClients.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topClients} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }}
                                    formatter={(v) => [`${v} unidades`, 'Cantidad']}
                                />
                                <Bar dataKey="botellones" radius={[6, 6, 0, 0]} maxBarSize={40} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[260px] items-center justify-center text-sm text-muted">
                            Sin datos de clientes aún
                        </div>
                    )}
                </div>

                <div className={CARD.replace('mb-5 ', '')}>
                    <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-display text-lg text-text">Formas de pago</h3>
                    </div>
                    {serviceTypes.length > 0 ? (
                        <div className="flex items-center gap-5">
                            <ResponsiveContainer width="50%" height={220}>
                                <PieChart>
                                    <Pie data={serviceTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                                        {serviceTypes.map((_, i) => (
                                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }}
                                        formatter={(v) => [`${v} ventas`, 'Cantidad']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-3.5 flex flex-1 flex-col gap-2.5">
                                {serviceTypes.map((s, i) => (
                                    <div key={s.name} className="flex items-center gap-2.5 text-[13px]">
                                        <div className="h-3 w-3 flex-shrink-0 rounded-[3px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                        <span className="flex-1 font-medium text-text">{s.name}</span>
                                        <span className="font-semibold text-muted">
                                            {donutTotal > 0 ? Math.round((s.value / donutTotal) * 100) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-[220px] items-center justify-center text-sm text-muted">
                            Sin datos de ventas aún
                        </div>
                    )}
                </div>
            </div>

            <h2 className={SECTION_TITLE}>
                <FiFileText className="mr-2 align-middle" />
                Informes gerenciales
            </h2>

            <div className="mb-6 rounded-[14px] border border-border bg-white p-5" id="informe-gerencial-print">
                <p className="mb-3.5 text-sm text-muted">
                    Genere informes detallados por período o posición contable. Exporte a CSV o descargue un PDF gerencial con el mismo formato que las facturas.
                </p>

                <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] items-end gap-3.5">
                    <label className={FORM_LABEL}>
                        Tipo de informe
                        <select className={FORM_INPUT} value={tipoInforme} onChange={(e) => setTipoInforme(e.target.value)}>
                            {reportesApi.TIPOS_INFORME.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </label>
                    {tipoConfig?.requiereFechas && (
                        <>
                            <label className={FORM_LABEL}>
                                Desde
                                <input className={FORM_INPUT} type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                            </label>
                            <label className={FORM_LABEL}>
                                Hasta
                                <input className={FORM_INPUT} type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                            </label>
                        </>
                    )}
                    <label className={FORM_LABEL}>
                        Sucursal
                        <input className={FORM_INPUT} type="number" value={sucursalId} readOnly />
                    </label>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    <button className={BTN_REP_PRIMARY} onClick={generarInforme} disabled={generando}>
                        <FiSearch className={generando ? 'animate-spin' : ''} />
                        {generando ? 'Generando…' : 'Generar informe'}
                    </button>
                    {informe && (
                        <>
                            <button className={BTN_REP} onClick={exportInformeCsv}>
                                <FiDownload /> Exportar CSV
                            </button>
                            <button className={BTN_REP_PRIMARY} onClick={descargarInformePdf} disabled={pdfInformeLoading}>
                                <FiFileText className={pdfInformeLoading ? 'animate-spin' : ''} />
                                {pdfInformeLoading ? 'Generando PDF…' : 'Descargar PDF'}
                            </button>
                        </>
                    )}
                </div>

                {informe && (
                    <div className="mt-5 border-t border-border pt-4">
                        <h3 className="mb-3 font-display text-lg text-text">{informe.titulo}</h3>
                        {informe.periodo && (
                            <p className="mb-3 text-[13px] text-muted">
                                Período: {informe.periodo.desde || '—'} al {informe.periodo.hasta || '—'}
                            </p>
                        )}
                        {renderTotalesInforme()}
                        {renderTablaInforme()}
                        {informe.tipo === 'clientes_cxc' && informe.cxcDocumentos?.length > 0 && (
                            <>
                                <h4 className="mt-5 text-[15px]">Documentos CXC pendientes</h4>
                                <div className={TABLE_WRAP}>
                                    <table className={DATA_TABLE}>
                                        <thead>
                                            <tr>
                                                <th className={DT_TH}>Cliente</th>
                                                <th className={DT_TH}>Documento</th>
                                                <th className={DT_TH}>Vencimiento</th>
                                                <th className={DT_TH}>Saldo</th>
                                                <th className={DT_TH}>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {informe.cxcDocumentos.map((cx, i) => (
                                                <tr key={i}>
                                                    <td className={DT_TD}>{cx.cliente}</td>
                                                    <td className={DT_TD}>{cx.serieCorrelativo || '—'}</td>
                                                    <td className={DT_TD}>{cx.vencimiento}</td>
                                                    <td className={DT_TD}>${Number(cx.saldo).toFixed(2)}</td>
                                                    <td className={DT_TD}>{cx.estado}</td>
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
