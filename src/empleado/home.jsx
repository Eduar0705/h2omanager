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

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const ICON_CHIP = {
  blue: "bg-accent/10 text-accent",
  green: "bg-accent2/10 text-accent2",
  orange: "bg-[#ea821e]/10 text-[#ea821e]",
};

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

  const stats = [
    {
      icon: FiDollarSign,
      color: "green",
      value: resumen?.ventasHoy?.cantidad ?? "—",
      label: `Ventas hoy ($${Number(resumen?.ventasHoy?.totalUsd ?? 0).toFixed(2)})`,
    },
    { icon: FiPackage, color: "blue", value: resumen?.unidadesStock ?? "—", label: "Unidades en stock" },
    { icon: FiUsers, color: "orange", value: resumen?.clientes?.activos ?? "—", label: "Clientes al día" },
  ];

  return (
    <div className="flex min-h-full flex-col gap-6 p-6 font-body text-text">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-text">
            Hola, {user?.name || "vendedor"}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-muted">
            Panel del vendedor · Sucursal {sucursalId}
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

      <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] max-[480px]:grid-cols-1">
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

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-brand">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold tracking-tight text-text">Acciones Rápidas</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 max-[600px]:grid-cols-1">
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
    </div>
  );
}
