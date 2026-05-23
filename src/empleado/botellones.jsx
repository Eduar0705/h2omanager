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
import {
  MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD,
  STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
  CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, FILTER_SELECT,
  TABLE_WRAP, TABLE, EMPTY, BADGE, BADGE_VARIANT,
} from "../ui/mod";

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
    <div className={MODULE_CONTAINER}>
      <div className={MODULE_HEADER}>
        <div className="title-section">
          <h1>Inventario</h1>
          <p>Consulta de existencias · Sucursal {sucursalId}</p>
        </div>
        <div className={HEADER_ACTIONS}>
          <button className={BTN_MOD} onClick={loadData} disabled={isLoading}>
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      <div className={STATS}>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.blue}`}><FiPackage /></div>
          <div><p className={STAT_VAL}>{stats.total}</p><p className={STAT_LBL}>Ítems</p></div>
        </div>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiCheckCircle /></div>
          <div><p className={STAT_VAL}>{stats.unidades}</p><p className={STAT_LBL}>Unidades en stock</p></div>
        </div>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.red}`}><FiAlertTriangle /></div>
          <div><p className={STAT_VAL}>{stats.bajos}</p><p className={STAT_LBL}>Stock bajo</p></div>
        </div>
      </div>

      <div className={CONTROLS}>
        <div className={SEARCH_BOX}>
          <FiSearch className={SEARCH_ICON} />
          <input
            type="text"
            className={SEARCH_INPUT}
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={FILTER_SELECT} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className={TABLE_WRAP}>
        {filtered.length === 0 ? (
          <div className={EMPTY}>
            <FiPackage />
            <h3>{isLoading ? "Cargando..." : "Sin ítems"}</h3>
            <p>{isLoading ? "Obteniendo datos de la API" : "No hay ítems para los filtros aplicados"}</p>
          </div>
        ) : (
          <table className={TABLE}>
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
                      <span className={`${BADGE} ${BADGE_VARIANT.inactive}`}>No aplica</span>
                    ) : it.stockBajo ? (
                      <span className={`${BADGE} ${BADGE_VARIANT.cancelada}`}>Stock bajo</span>
                    ) : (
                      <span className={`${BADGE} ${BADGE_VARIANT.active}`}>Disponible</span>
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
