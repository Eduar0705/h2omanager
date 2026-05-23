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

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

// Clases de chip de icono por color (mismo tono que el resto del sistema).
const ICON_CHIP = {
  blue: "bg-accent/10 text-accent",
  green: "bg-accent2/10 text-accent2",
  orange: "bg-[#ea821e]/10 text-[#ea821e]",
  red: "bg-danger/10 text-danger",
};

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
    buckets.push({ key: d.toISOString().slice(0, 10), dia: DIAS[d.getDay()], total: 0 });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  for (const doc of docs) {
    const fecha = new Date(String(doc.fecha || "").replace(" ", "T"));
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

const cardCls = "rounded-2xl border border-border bg-surface p-6 shadow-brand";
const cardHeadCls = "mb-4 flex items-center justify-between";
const cardTitleCls = "font-display text-base font-extrabold tracking-tight text-text";
const btnVerCls =
  "flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent to-accent2 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_3px_12px_rgba(0,119,204,0.25)] transition hover:-translate-y-px hover:brightness-105";

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
      setLowStock((Array.isArray(inventory) ? inventory : []).filter((it) => it.stockBajo));
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
  const haySalesChart = useMemo(() => chartData.some((d) => d.total > 0), [chartData]);
  const ultimasVentas = useMemo(
    () => [...sales].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5),
    [sales]
  );

  const stats = [
    { icon: FiPackage, color: "blue", value: resumen?.unidadesStock ?? "—", label: "Unidades en stock (productos)" },
    { icon: FiUsers, color: "green", value: resumen?.clientes?.activos ?? "—", label: "Clientes al día" },
    {
      icon: FiDollarSign,
      color: "orange",
      value: resumen?.ventasHoy?.cantidad ?? "—",
      label: `Ventas hoy ($${Number(resumen?.ventasHoy?.totalUsd ?? 0).toFixed(2)})`,
    },
    { icon: FiAlertTriangle, color: "red", value: resumen?.clientes?.morosos ?? "—", label: "Clientes con saldo pendiente" },
  ];

  const indicadores = resumen
    ? [
        { icon: FiAlertTriangle, color: "red", value: resumen.alertasStockBajo ?? 0, label: "Alertas de stock bajo" },
        { icon: FiCreditCard, color: "orange", value: `$${Number(resumen.cxcPendienteUsd ?? 0).toFixed(2)}`, label: "CXC pendiente (clientes)" },
        { icon: FiFileText, color: "blue", value: `$${Number(resumen.cxcDocumentosUsd ?? 0).toFixed(2)}`, label: "CXC en documentos" },
        { icon: FiLayers, color: "green", value: resumen.serviciosActivos ?? 0, label: "Servicios en catálogo" },
      ]
    : [];

  return (
    <div className="flex min-h-full flex-col gap-6 p-6 font-body text-text">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-text">Dashboard</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">
            Resumen en tiempo real · Sucursal {sucursalId}
            {resumen?.fecha ? ` · ${resumen.fecha}` : ""}
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-[9px] border border-border bg-surface px-[18px] py-2.5 text-[13.5px] font-medium text-text shadow-brand transition hover:border-accent hover:text-accent disabled:opacity-60"
          onClick={cargar}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-[10px] border border-danger/30 bg-danger/[0.06] px-[18px] py-3 text-[13.5px] font-medium text-[#b91c1c]">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 max-[1400px]:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] max-[480px]:grid-cols-1">
        {stats.map(({ icon: Icon, color, value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface px-5 py-6 text-center shadow-brand transition hover:-translate-y-1 hover:shadow-brand-lg"
          >
            <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[22px] ${ICON_CHIP[color]}`}>
              <Icon />
            </div>
            <p className="font-display text-[32px] font-extrabold leading-none tracking-tight text-text">
              {loading ? "…" : value}
            </p>
            <p className="text-[12.5px] font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Indicadores del día */}
      {!error && resumen && (
        <div className={cardCls}>
          <div className={cardHeadCls}>
            <h2 className={cardTitleCls}>Indicadores del día</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
            {indicadores.map(({ icon: Icon, color, value, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-lg ${ICON_CHIP[color]}`}>
                  <Icon />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-xl font-extrabold leading-none tracking-tight text-text">{value}</span>
                  <span className="text-[11.5px] font-medium leading-snug text-muted">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid inferior */}
      <div className="grid grid-cols-[1fr_380px] items-start gap-6 max-[1200px]:grid-cols-1">
        {/* Izquierda */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className={cardCls}>
            <div className={cardHeadCls}>
              <h2 className={cardTitleCls}>Ventas de los últimos 7 días</h2>
              <FiTrendingUp className="text-lg text-accent" />
            </div>
            {haySalesChart ? (
              <div className="h-60 w-full">
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
              <div className="flex h-60 flex-col items-center justify-center gap-2 text-[13.5px] text-muted">
                <FiTrendingUp className="text-[32px] opacity-35" />
                <span>{loading ? "Cargando ventas…" : "Sin ventas registradas en los últimos 7 días"}</span>
              </div>
            )}
          </div>

          <div className={cardCls}>
            <div className={cardHeadCls}>
              <h2 className={cardTitleCls}>Últimas ventas</h2>
              <button className={btnVerCls} onClick={() => navigate("/gerente/historial")}>
                Ver historial
              </button>
            </div>
            {ultimasVentas.length === 0 ? (
              <div className="px-3 py-7 text-center text-[13.5px] text-muted">
                <FiShoppingBag className="mx-auto mb-2 text-3xl text-accent2/60" />
                {loading ? "Cargando…" : "Aún no hay ventas registradas"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 pb-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted">Documento</th>
                      <th className="px-3 pb-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted">Cliente</th>
                      <th className="px-3 pb-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted">Fecha</th>
                      <th className="px-3 pb-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasVentas.map((v) => (
                      <tr key={v.id} className="border-b border-border transition last:border-0 hover:bg-bg">
                        <td className="px-3 py-3 font-semibold text-text">{v.serieCorrelativo || `DOC-${v.id}`}</td>
                        <td className="px-3 py-3 text-muted">{v.cliente || "—"}</td>
                        <td className="px-3 py-3 text-muted">{formatFechaCorta(v.fecha)}</td>
                        <td className="px-3 py-3 text-right font-bold text-text">${Number(v.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Derecha */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className={cardCls}>
            <div className={cardHeadCls}>
              <h2 className={cardTitleCls}>Acciones Rápidas</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {acciones.map(({ icon: Icon, label, link }) => (
                <button
                  key={link}
                  className="group flex w-full items-center gap-3 rounded-[10px] border border-border bg-bg px-3.5 py-3 text-left text-[13.5px] font-medium text-text transition hover:border-accent hover:bg-surface hover:text-accent"
                  onClick={() => navigate(link)}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-base text-muted transition group-hover:text-accent">
                    <Icon />
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={cardCls}>
            <div className={cardHeadCls}>
              <h2 className={cardTitleCls}>Stock bajo</h2>
              <button className={btnVerCls} onClick={() => navigate("/gerente/botellones")}>
                Inventario
              </button>
            </div>
            {lowStock.length === 0 ? (
              <div className="px-3 py-7 text-center text-[13.5px] text-muted">
                <FiCheckCircle className="mx-auto mb-2 text-3xl text-accent2/60" />
                <div>{loading ? "Cargando…" : "Todo el inventario está en orden"}</div>
              </div>
            ) : (
              <div className="flex flex-col">
                {lowStock.slice(0, 5).map((it) => (
                  <div key={it.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-danger/10 text-base text-danger">
                      <FiPackage />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13.5px] font-semibold text-text">{it.name}</span>
                      <span className="text-xs text-muted">Mínimo: {it.minStock} {it.unit}</span>
                    </div>
                    <span className="flex-shrink-0 font-display text-sm font-extrabold text-danger">
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
