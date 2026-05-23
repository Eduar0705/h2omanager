import { useState, useEffect, useCallback } from "react";
import {
  FiRefreshCw,
  FiPackage,
  FiUsers,
  FiDollarSign,
  FiPlus,
  FiUserPlus,
  FiClock,
} from "react-icons/fi";
import { TbBottle } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as dashboardService from "../gerente/services/dashboard.service";
import "../assets/css/dashboard.css";

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const acciones = [
  { icon: FiPlus, label: "Nueva Venta", link: "/empleado/ventas" },
  { icon: FiUserPlus, label: "Nuevo Cliente", link: "/empleado/clientes" },
  { icon: TbBottle, label: "Inventario", link: "/empleado/botellones" },
  { icon: FiClock, label: "Historial", link: "/empleado/historial" },
];

export default function HomeEmpleado() {
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
      setError(e?.message || "No se pudo cargar el panel");
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Indicadores operativos del vendedor (sin datos financieros sensibles).
  const stats = [
    {
      icon: FiDollarSign,
      color: "green",
      value: resumen?.ventasHoy?.cantidad ?? "—",
      label: `Ventas hoy ($${Number(resumen?.ventasHoy?.totalUsd ?? 0).toFixed(2)})`,
    },
    {
      icon: FiPackage,
      color: "blue",
      value: resumen?.unidadesStock ?? "—",
      label: "Unidades en stock",
    },
    {
      icon: FiUsers,
      color: "orange",
      value: resumen?.clientes?.activos ?? "—",
      label: "Clientes al día",
    },
  ];

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Hola, {user?.name || "vendedor"}</h1>
          <p className="dash-sub">
            Panel del vendedor · Sucursal {sucursalId}
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
