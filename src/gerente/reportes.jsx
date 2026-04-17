import { useState, useEffect, useMemo } from 'react';
import {
    FiDollarSign, FiUsers, FiTruck,
    FiDownload, FiFileText, FiRefreshCw,
    FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';
import { TbBottle } from 'react-icons/tb';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import * as ventaService from './services/ventas.service';
import * as clientService from './services/clientes.service';
import * as botellonService from './services/botellones.service';
import * as configService from './services/config.service';
import '../assets/css/reportes.css';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#06b6d4'];

export default function Reportes() {
    const [sales, setSales] = useState([]);
    const [clients, setClients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [s, c, inv, hist, conf] = await Promise.all([
                ventaService.getSales(), clientService.getClients(),
                botellonService.getInventory(), botellonService.getHistory(),
                configService.getCurrencyConfig()
            ]);
            setSales(s || []); setClients(c || []); setInventory(inv || []);
            setHistory(hist || []); setConfig(conf);
        } catch (e) { console.error('Error loading report data:', e); }
        finally { setIsLoading(false); }
    };

    // ─── Stats ──────────────────────
    const totalUSD = sales.reduce((a, s) => a + (s.totalUSD || 0), 0);
    const totalBottlesDelivered = history
        .filter(m => m.type === 'out')
        .reduce((a, m) => a + m.amount, 0);
    const totalSalesCount = sales.length || 1;
    const routeEfficiency = Math.round((totalBottlesDelivered / totalSalesCount) * 10);

    // ─── Monthly sales chart data ───
    const monthlySales = useMemo(() => {
        const data = MONTHS.map((name, i) => ({ name, ventas: 0 }));
        sales.forEach(s => {
            if (!s.date) return;
            const d = new Date(s.date);
            const month = d.getMonth();
            data[month].ventas += (s.totalUSD || 0);
        });
        return data.map(d => ({ ...d, ventas: Math.round(d.ventas * 100) / 100 }));
    }, [sales]);

    // ─── Top clients by bottles ─────
    const topClients = useMemo(() => {
        const map = {};
        sales.forEach(s => {
            const name = s.client?.name || 'Desconocido';
            const qty = (s.items || []).reduce((a, i) => a + (i.qty || 0), 0);
            map[name] = (map[name] || 0) + qty;
        });
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, botellones: qty }));
    }, [sales]);

    // ─── Service types donut ────────
    const serviceTypes = useMemo(() => {
        // Breakdown by delivery type
        const local = sales.filter(s => s.type === 'local').length;
        const delivery = sales.filter(s => s.type === 'delivery').length;
        // Breakdown by payment
        const payMap = {};
        sales.forEach(s => {
            const m = s.paymentMethod || 'otro';
            payMap[m] = (payMap[m] || 0) + 1;
        });

        const PAY_LABELS = {
            efectivo_usd: 'Efectivo USD', efectivo_ves: 'Efectivo Bs',
            pago_movil: 'Pago Móvil', transferencia: 'Transferencia',
            punto: 'Punto de Venta', mixto: 'Pago Mixto', otro: 'Otro'
        };

        return Object.entries(payMap)
            .sort((a, b) => b[1] - a[1])
            .map(([key, value]) => ({ name: PAY_LABELS[key] || key, value }));
    }, [sales]);

    const donutTotal = serviceTypes.reduce((a, s) => a + s.value, 0);

    // ─── Export CSV ─────────────────
    const exportCSV = () => {
        const header = 'ID,Fecha,Cliente,Tipo,Método,Total USD\n';
        const rows = sales.map(s =>
            `${s.id},${s.date},${s.client?.name || ''},${s.type},${s.paymentMethod},${s.totalUSD || 0}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ─── Custom tooltip ──────────────
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '13px' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)' }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--accent)', fontWeight: 600 }}>${payload[0].value.toFixed(2)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="reportes-container">
            {/* HEADER */}
            <div className="reportes-header">
                <div className="title-section">
                    <h1>Reportes y Analítica</h1>
                    <p>Resumen del rendimiento del negocio de agua</p>
                </div>
                <div className="rep-header-actions">
                    <button className="btn-rep" onClick={loadData} disabled={isLoading}>
                        <FiRefreshCw className={isLoading ? 'spin' : ''} />
                    </button>
                    <button className="btn-rep" onClick={exportCSV}>
                        <FiDownload /> Exportar CSV
                    </button>
                    <button className="btn-rep primary" onClick={() => window.print()}>
                        <FiFileText /> Descargar Reporte PDF
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ─────────────────────── */}
            <div className="rep-stats">
                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Ventas Totales</p>
                        <p className="rep-stat-value">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        <div className="rep-stat-trend up">
                            <FiTrendingUp size={14} /> +12.5% <span className="trend-text">vs mes anterior</span>
                        </div>
                    </div>
                    <div className="rep-stat-icon blue"><FiDollarSign /></div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Botellones Entregados</p>
                        <p className="rep-stat-value">{totalBottlesDelivered.toLocaleString()}</p>
                        <div className="rep-stat-trend up">
                            <FiTrendingUp size={14} /> +5.2% <span className="trend-text">vs mes anterior</span>
                        </div>
                    </div>
                    <div className="rep-stat-icon cyan"><TbBottle /></div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Nuevos Clientes</p>
                        <p className="rep-stat-value">{clients.length}</p>
                        <div className="rep-stat-trend down">
                            <FiTrendingDown size={14} /> -2.1% <span className="trend-text">vs mes anterior</span>
                        </div>
                    </div>
                    <div className="rep-stat-icon orange"><FiUsers /></div>
                </div>

                <div className="rep-stat-card">
                    <div className="rep-stat-left">
                        <p className="rep-stat-label">Eficacia de Rutas</p>
                        <p className="rep-stat-value">{routeEfficiency}%</p>
                        <div className="rep-stat-trend up">
                            <FiTrendingUp size={14} /> +1.4% <span className="trend-text">vs mes anterior</span>
                        </div>
                    </div>
                    <div className="rep-stat-icon green"><FiTruck /></div>
                </div>
            </div>

            {/* ── LINE CHART: VENTAS MENSUALES ──── */}
            <div className="rep-chart-card">
                <div className="rep-chart-header">
                    <h3>Ventas Mensuales</h3>
                    <span className="rep-period-btn">Últimos 12 meses</span>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={monthlySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2.5}
                            dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── BOTTOM: BAR + DONUT ──────────── */}
            <div className="rep-bottom-grid">
                {/* Bar chart: Top Clientes */}
                <div className="rep-chart-card">
                    <div className="rep-chart-header">
                        <h3>Top Clientes (Botellones)</h3>
                        <button className="rep-link-btn">Ver todos</button>
                    </div>
                    {topClients.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topClients} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px' }}
                                    formatter={(v) => [`${v} botellones`, 'Cantidad']}
                                />
                                <Bar dataKey="botellones" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {topClients.map((_, i) => (
                                        <Cell key={i} fill={`rgba(59, 130, 246, ${1 - i * 0.15})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                            Sin datos de clientes aún
                        </div>
                    )}
                </div>

                {/* Donut chart: Tipos de Servicios */}
                <div className="rep-chart-card">
                    <div className="rep-chart-header">
                        <h3>Tipos de Servicios</h3>
                    </div>
                    {serviceTypes.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <ResponsiveContainer width="50%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={serviceTypes}
                                        cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
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
                            <div className="donut-legend" style={{ flex: 1 }}>
                                {serviceTypes.map((s, i) => (
                                    <div key={s.name} className="donut-legend-item">
                                        <div className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                        <span className="donut-legend-label">{s.name}</span>
                                        <span className="donut-legend-val">{donutTotal > 0 ? Math.round((s.value / donutTotal) * 100) : 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                            Sin datos de servicios aún
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
