import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FiRefreshCw,
  FiPackage,
  FiUsers,
  FiDollarSign,
  FiAlertTriangle,
  FiPlus,
  FiUserPlus,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiTrendingUp,
  FiCheckCircle,
  FiShoppingBag,
} from "react-icons/fi";
import { TbBottle } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import * as dashboardService from "./services/dashboard.service";
import * as ventaService from "./services/ventas.service";
import { getInventory } from "./services/botellones.service";
import "../assets/css/dashboard.css";

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const acciones = [
  { icon: FiPlus, label: "Nueva Venta", link: "/gerente/ventas" },
  { icon: FiUserPlus, label: "Nuevo Cliente", link: "/gerente/clientes" },
  { icon: TbBottle, label: "Inventario", link: "/gerente/botellones" },
  { icon: FiFileText, label: "Reportes", link: "/gerente/reportes" },
];

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Agrupa el total vendido por día para los últimos 7 días (incluido hoy). */
function ventasUltimos7Dias(docs) {
  const hoy = new Date();
  const buckets = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.push({
      key: d.toISOString().slice(0, 10),
      dia: DIAS[d.getDay()],
      total: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const doc of docs) {
    const raw = String(doc.fecha || "").replace(" ", "T");
    const fecha = new Date(raw);
    if (Number.isNaN(fecha.getTime())) continue;
    const key = fecha.toISOString().slice(0, 10);
    if (byKey[key] && String(doc.estado).toLowerCase() !== "anulado") {
      byKey[key].total += Number(doc.total || 0);
    }
  }
  return buckets.map((b) => ({ dia: b.dia, total: Number(b.total.toFixed(2)) }));
}

function formatFechaCorta(dateStr) {
  const d = new Date(String(dateStr || "").replace(" ", "T"));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
}

export default function HomeGere() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sucursalId = Number(user?.sucursalId ?? DEFAULT_SUCURSAL_ID);

  const [resumen, setResumen] = useState(null);
  const [sales, setSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenData, salesData, inventory] = await Promise.all([
        dashboardService.getDashboardResumen(sucursalId),
        ventaService.getSalesHistory().catch(() => []),
        getInventory(sucursalId).catch(() => []),
      ]);
      setResumen(resumenData);
      setSales(Array.isArray(salesData) ? salesData : []);
      setLowStock(
        (Array.isArray(inventory) ? inventory : []).filter((it) => it.stockBajo)
      );
    } catch (e) {
      setError(e?.message || "No se pudo cargar el dashboard");
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const chartData = useMemo(() => ventasUltimos7Dias(sales), [sales]);
  const haySalesChart = useMemo(
    () => chartData.some((d) => d.total > 0),
    [chartData]
  );
  const ultimasVentas = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 5);
  }, [sales]);

  const stats = [
    {
      icon: FiPackage,
      color: "blue",
      value: resumen?.unidadesStock ?? "—",
      label: "Unidades en stock (productos)",
    },
    {
      icon: FiUsers,
      color: "green",
      value: resumen?.clientes?.activos ?? "—",
      label: "Clientes al día",
    },
    {
      icon: FiDollarSign,
      color: "orange",
      value: resumen?.ventasHoy?.cantidad ?? "—",
      label: `Ventas hoy ($${Number(resumen?.ventasHoy?.totalUsd ?? 0).toFixed(2)})`,
    },
    {
      icon: FiAlertTriangle,
      color: "red",
      value: resumen?.clientes?.morosos ?? "—",
      label: "Clientes con saldo pendiente",
    },
  ];

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">
            Resumen en tiempo real · Sucursal {sucursalId}
            {resumen?.fecha ? ` · ${resumen.fecha}` : ""}
          </p>
        </div>
        <button className="dash-refresh" onClick={cargar} disabled={loading}>
          <FiRefreshCw className={loading ? "spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="dash-banner" style={{ background: "#fef2f2", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div className="dash-stats">
        {stats.map(({ icon: Icon, color, value, label }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon-wrap color-${color}`}>
              <Icon />
            </div>
            <p className="stat-value">{loading ? "…" : value}</p>
            <p className="stat-label">{label}</p>
          </div>
        ))}
      </div>

      {!error && resumen && (
        <div className="dash-card">
          <div className="dash-card-header">
            <h2>Indicadores del día</h2>
          </div>
          <div className="dash-indicadores">
            <div className="indicador-item">
              <div className="indicador-icon color-red">
                <FiAlertTriangle />
              </div>
              <div className="indicador-text">
                <span className="ind-value">{resumen.alertasStockBajo ?? 0}</span>
                <span className="ind-label">Alertas de stock bajo</span>
              </div>
            </div>
            <div className="indicador-item">
              <div className="indicador-icon color-orange">
                <FiCreditCard />
              </div>
              <div className="indicador-text">
                <span className="ind-value">
                  ${Number(resumen.cxcPendienteUsd ?? 0).toFixed(2)}
                </span>
                <span className="ind-label">CXC pendiente (clientes)</span>
              </div>
            </div>
            <div className="indicador-item">
              <div className="indicador-icon color-blue">
                <FiFileText />
              </div>
              <div className="indicador-text">
                <span className="ind-value">
                  ${Number(resumen.cxcDocumentosUsd ?? 0).toFixed(2)}
                </span>
                <span className="ind-label">CXC en documentos</span>
              </div>
            </div>
            <div className="indicador-item">
              <div className="indicador-icon color-green">
                <FiLayers />
              </div>
              <div className="indicador-text">
                <span className="ind-value">{resumen.serviciosActivos ?? 0}</span>
                <span className="ind-label">Servicios en catálogo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-grid">
        {/* Columna izquierda: tendencia + últimas ventas */}
        <div className="dash-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Ventas de los últimos 7 días</h2>
              <FiTrendingUp style={{ color: "var(--accent)", fontSize: 18 }} />
            </div>
            {haySalesChart ? (
              <div className="dash-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0077cc" />
                        <stop offset="100%" stopColor="#00b899" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#6b85a3" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b85a3" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,119,204,0.06)" }}
                      formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #d0dcea", fontSize: 13 }}
                    />
                    <Bar dataKey="total" fill="url(#barFill)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="dash-chart-empty">
                <FiTrendingUp />
                <span>{loading ? "Cargando ventas…" : "Sin ventas registradas en los últimos 7 días"}</span>
              </div>
            )}
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Últimas ventas</h2>
              <button className="btn-ver" onClick={() => navigate("/gerente/historial")}>
                Ver historial
              </button>
            </div>
            {ultimasVentas.length === 0 ? (
              <div className="dash-empty-soft">
                <FiShoppingBag style={{ display: "block", margin: "0 auto" }} />
                {loading ? "Cargando…" : "Aún no hay ventas registradas"}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasVentas.map((v) => (
                      <tr key={v.id}>
                        <td className="td-name">{v.serieCorrelativo || `DOC-${v.id}`}</td>
                        <td className="td-muted">{v.cliente || "—"}</td>
                        <td className="td-muted">{formatFechaCorta(v.fecha)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          ${Number(v.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: acciones + stock bajo */}
        <div className="dash-col">
          <div className="dash-card acciones-card">
            <div className="dash-card-header">
              <h2>Acciones Rápidas</h2>
            </div>
            <div className="acciones-list">
              {acciones.map(({ icon: Icon, label, link }) => (
                <button key={link} className="accion-btn" onClick={() => navigate(link)}>
                  <span className="accion-icon">
                    <Icon />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h2>Stock bajo</h2>
              <button className="btn-ver" onClick={() => navigate("/gerente/botellones")}>
                Inventario
              </button>
            </div>
            {lowStock.length === 0 ? (
              <div className="dash-empty-soft">
                <FiCheckCircle />
                <div>{loading ? "Cargando…" : "Todo el inventario está en orden"}</div>
              </div>
            ) : (
              <div className="dash-mini-list">
                {lowStock.slice(0, 5).map((it) => (
                  <div className="dash-mini-row" key={it.id}>
                    <div className="dash-mini-icon color-red">
                      <FiPackage />
                    </div>
                    <div className="dash-mini-info">
                      <span className="dash-mini-name">{it.name}</span>
                      <span className="dash-mini-sub">Mínimo: {it.minStock} {it.unit}</span>
                    </div>
                    <span className="dash-mini-val" style={{ color: "#e03e3e" }}>
                      {it.stock} {it.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
