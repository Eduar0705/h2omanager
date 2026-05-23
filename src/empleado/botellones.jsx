import { useState, useEffect, useMemo } from "react";
import {
  FiSearch,
  FiRefreshCw,
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import Swal from "sweetalert2";
import { useAuth } from "../auth/AuthContext";
import { getInventory } from "../gerente/services/botellones.service";
import "../assets/css/modulos.css";

const DEFAULT_SUCURSAL_ID = Number(import.meta.env.VITE_DEFAULT_SUCURSAL_ID || 1);

const TIPOS = [
  { value: "todos", label: "Todos" },
  { value: "PRODUCTO", label: "Productos" },
  { value: "INSUMO", label: "Insumos" },
  { value: "SERVICIO", label: "Servicios" },
];

export default function BotellonesEmpleado() {
  const { user } = useAuth();
  const sucursalId = Number(user?.sucursalId ?? DEFAULT_SUCURSAL_ID);

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("todos");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getInventory(sucursalId);
      setItems(data || []);
    } catch (e) {
      Swal.fire("Error", e?.message || "No se pudo cargar el inventario", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchTipo = tipo === "todos" || it.type === tipo;
      const matchSearch =
        !q ||
        String(it.name || "").toLowerCase().includes(q) ||
        String(it.sku || "").toLowerCase().includes(q);
      return matchTipo && matchSearch;
    });
  }, [items, search, tipo]);

  const stats = useMemo(() => {
    const conStock = items.filter((it) => it.controlaStock);
    const unidades = conStock.reduce((acc, it) => acc + Number(it.stock || 0), 0);
    const bajos = conStock.filter((it) => it.stockBajo).length;
    return { total: items.length, unidades, bajos };
  }, [items]);

  return (
    <div className="module-container">
      <div className="module-header">
        <div className="title-section">
          <h1>Inventario</h1>
          <p>Consulta de existencias · Sucursal {sucursalId}</p>
        </div>
        <div className="module-header-actions">
          <button className="btn-mod" onClick={loadData} disabled={isLoading}>
            <FiRefreshCw className={isLoading ? "spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      <div className="mod-stats">
        <div className="mod-stat-card">
          <div className="mod-stat-icon blue"><FiPackage /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.total}</p>
            <p className="mod-lbl">Ítems</p>
          </div>
        </div>
        <div className="mod-stat-card">
          <div className="mod-stat-icon green"><FiCheckCircle /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.unidades}</p>
            <p className="mod-lbl">Unidades en stock</p>
          </div>
        </div>
        <div className="mod-stat-card">
          <div className="mod-stat-icon red"><FiAlertTriangle /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.bajos}</p>
            <p className="mod-lbl">Stock bajo</p>
          </div>
        </div>
      </div>

      <div className="mod-controls">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="mod-table-wrap">
        {filtered.length === 0 ? (
          <div className="mod-empty">
            <FiPackage />
            <h3>{isLoading ? "Cargando..." : "Sin ítems"}</h3>
            <p>{isLoading ? "Obteniendo datos de la API" : "No hay ítems para los filtros aplicados"}</p>
          </div>
        ) : (
          <table className="mod-table">
            <thead>
              <tr>
                <th>Ítem</th>
                <th>SKU</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Stock</th>
                <th style={{ textAlign: "right" }}>Mínimo</th>
                <th style={{ textAlign: "right" }}>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.sku || "—"}</td>
                  <td>{it.tipoLabel}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {it.controlaStock ? `${it.stock} ${it.unit}` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {it.controlaStock ? it.minStock : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>${Number(it.price || 0).toFixed(2)}</td>
                  <td>
                    {!it.controlaStock ? (
                      <span className="mod-badge inactive">No aplica</span>
                    ) : it.stockBajo ? (
                      <span className="mod-badge cancelada">Stock bajo</span>
                    ) : (
                      <span className="mod-badge active">Disponible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
