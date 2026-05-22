import { useState, useEffect, useCallback } from "react";
import {
  FiRefreshCw,
  FiPackage,
  FiUsers,
  FiDollarSign,
  FiAlertTriangle,
  FiPlus,
  FiUserPlus,
} from "react-icons/fi";
import { TbBottle } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as dashboardService from "./services/dashboard.service";
import "../assets/css/dashboard.css";

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const acciones = [
  { icon: FiPlus, label: "Nueva Venta", link: "/gerente/ventas" },
  { icon: FiUserPlus, label: "Nuevo Cliente", link: "/gerente/clientes" },
  { icon: TbBottle, label: "Inventario", link: "/gerente/botellones" },
];

export default function HomeGere() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sucursalId = Number(user?.sucursalId ?? DEFAULT_SUCURSAL_ID);

  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getDashboardResumen(sucursalId);
      setResumen(data);
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

      {!error && resumen && (
        <div className="dash-grid" style={{ marginBottom: "1rem" }}>
          <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
            <div className="dash-card-header">
              <h2>Indicadores del día</h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", padding: "0 1rem 1rem", fontSize: "14px" }}>
              <span>
                <strong>Alertas stock bajo:</strong> {resumen.alertasStockBajo}
              </span>
              <span>
                <strong>CXC pendiente (clientes):</strong> $
                {Number(resumen.cxcPendienteUsd ?? 0).toFixed(2)}
              </span>
              <span>
                <strong>CXC en documentos:</strong> $
                {Number(resumen.cxcDocumentosUsd ?? 0).toFixed(2)}
              </span>
              <span>
                <strong>Servicios en catálogo:</strong> {resumen.serviciosActivos}
              </span>
            </div>
          </div>
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

      <div className="dash-grid">
        <div className="dash-card acciones-card">
          <div className="dash-card-header">
            <h2>Acciones Rápidas</h2>
          </div>
          <div className="acciones-list">
            {acciones.map(({ icon: Icon, label, link }) => (
              <button
                key={link}
                className="accion-btn"
                onClick={() => navigate(link)}
              >
                <span className="accion-icon">
                  <Icon />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
