import { useState, useEffect } from "react";
import { FiRefreshCw, FiPackage, FiUsers, FiClock, FiPlus, FiUserPlus } from "react-icons/fi";
import { TbBottle } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import * as clientService from "./services/clientes.service";
import "../assets/css/dashboard.css";

const acciones = [
  { icon: FiPlus, label: "Nueva Venta", link: "/gerente/ventas" },
  { icon: FiUserPlus, label: "Nuevo Cliente", link: "/gerente/clientes" },
  { icon: TbBottle, label: "Registrar Botellones", link: "/gerente/botellones" },
];

export default function HomeGere() {
  const navigate = useNavigate();
  const [clientesActivos, setClientesActivos] = useState(0);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const lista = await clientService.getClients();
        const n = lista.filter((c) => c.status === "active").length;
        if (!cancelado) setClientesActivos(n);
      } catch {
        if (!cancelado) setClientesActivos(0);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const stats = [
    { icon: FiPackage, color: "blue", value: 347, label: "Botellones Disponibles" },
    { icon: FiUsers, color: "green", value: clientesActivos, label: "Clientes Activos" },
    { icon: FiPlus, color: "orange", value: 24, label: "Ventas Hoy" },
    { icon: FiClock, color: "red", value: 8, label: "Pendientes" },
  ];

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Bienvenido al sistema H2OManager</p>
        </div>
        <button className="dash-refresh">
          <FiRefreshCw />
          Actualizar
        </button>
      </div>

      {/* Banner demo */}
      <div className="dash-banner">
        ⚠ Mostrando datos de ejemplo. Conecta el backend para datos reales.
      </div>

      {/* Stats */}
      <div className="dash-stats">
        {stats.map(({ icon: Icon, color, value, label }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon-wrap color-${color}`}>
              <Icon />
            </div>
            <p className="stat-value">{value}</p>
            <p className="stat-label">{label}</p>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
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
