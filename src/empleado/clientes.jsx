import { useState, useEffect, useMemo } from "react";
import {
  FiSearch,
  FiRefreshCw,
  FiPlus,
  FiEdit2,
  FiUsers,
  FiUserCheck,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import Swal from "sweetalert2";
import {
  getClients,
  addClient,
  updateClient,
  deriveClientStatus,
} from "../gerente/services/clientes.service";
import {
  MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD, BTN_MOD_PRIMARY,
  STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
  CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, TABLE_WRAP, TABLE, EMPTY,
  BADGE, BADGE_VARIANT, ACTIONS, ACTION_BTN, PAGINATION, PAGE_BTNS, PAGE_BTN,
  MODAL_OVERLAY, MODAL, MODAL_HEADER, MODAL_CLOSE, MODAL_BODY, MODAL_FOOTER, FORM_ROW, FORM_GROUP,
} from "../ui/mod";

const STATUS_BADGE = {
  active: { cls: "active", label: "Al día" },
  delinquent: { cls: "pendiente", label: "Con saldo" },
  overlimit: { cls: "cancelada", label: "Sobre límite" },
};

const EMPTY_FORM = {
  name: "", cedula: "", phone: "", address: "", type: "Residencial", limiteCredito: "", diasCredito: "",
};

const ROWS_PER_PAGE = 10;

export default function ClientesEmpleado() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (e) {
      Swal.fire("Error", e?.message || "No se pudieron cargar los clientes", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.cedula || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const stats = useMemo(() => {
    const total = clients.length;
    const alDia = clients.filter((c) => deriveClientStatus(c) === "active").length;
    const conSaldo = total - alDia;
    return { total, alDia, conSaldo };
  }, [clients]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditingId(client.id);
    setForm({
      name: client.name || "",
      cedula: client.cedula || "",
      phone: client.phone || "",
      address: client.address || "",
      type: client.type || "Residencial",
      limiteCredito: client.limiteCredito || "",
      diasCredito: client.diasCredito || "",
    });
    setModalOpen(true);
  };

  const handleField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cedula.trim()) {
      Swal.fire("Datos incompletos", "Nombre y cédula/RIF son obligatorios.", "warning");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateClient(editingId, form);
      } else {
        await addClient(form);
      }
      setModalOpen(false);
      await loadData();
      Swal.fire({
        icon: "success",
        title: editingId ? "Cliente actualizado" : "Cliente creado",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err?.message || "No se pudo guardar el cliente", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={MODULE_CONTAINER}>
      <div className={MODULE_HEADER}>
        <div className="title-section">
          <h1>Clientes</h1>
          <p>Consulta y registra clientes</p>
        </div>
        <div className={HEADER_ACTIONS}>
          <button className={BTN_MOD} onClick={loadData} disabled={isLoading}>
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} /> Actualizar
          </button>
          <button className={BTN_MOD_PRIMARY} onClick={openCreate}>
            <FiPlus /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className={STATS}>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.blue}`}><FiUsers /></div>
          <div><p className={STAT_VAL}>{stats.total}</p><p className={STAT_LBL}>Clientes</p></div>
        </div>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiUserCheck /></div>
          <div><p className={STAT_VAL}>{stats.alDia}</p><p className={STAT_LBL}>Al día</p></div>
        </div>
        <div className={STAT_CARD}>
          <div className={`${STAT_ICON_BASE} ${STAT_ICON.amber}`}><FiAlertTriangle /></div>
          <div><p className={STAT_VAL}>{stats.conSaldo}</p><p className={STAT_LBL}>Con saldo</p></div>
        </div>
      </div>

      <div className={CONTROLS}>
        <div className={SEARCH_BOX}>
          <FiSearch className={SEARCH_ICON} />
          <input
            type="text"
            className={SEARCH_INPUT}
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={TABLE_WRAP}>
        {filtered.length === 0 ? (
          <div className={EMPTY}>
            <FiUsers />
            <h3>{isLoading ? "Cargando..." : "Sin clientes"}</h3>
            <p>{isLoading ? "Obteniendo datos de la API" : "No hay clientes para la búsqueda"}</p>
          </div>
        ) : (
          <>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cédula / RIF</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => {
                  const st = STATUS_BADGE[deriveClientStatus(c)] || STATUS_BADGE.active;
                  return (
                    <tr key={c.id}>
                      <td>{c.name || "—"}</td>
                      <td>{c.cedula || "—"}</td>
                      <td>{c.phone || "—"}</td>
                      <td>{c.type || "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ${Number(c.saldo || 0).toFixed(2)}
                      </td>
                      <td>
                        <span className={`${BADGE} ${BADGE_VARIANT[st.cls]}`}>{st.label}</span>
                      </td>
                      <td>
                        <div className={`${ACTIONS} justify-end`}>
                          <button className={ACTION_BTN} title="Editar" onClick={() => openEdit(c)}>
                            <FiEdit2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={PAGINATION}>
              <span>
                {(page - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(page * ROWS_PER_PAGE, filtered.length)} de {filtered.length}
              </span>
              <div className={PAGE_BTNS}>
                <button className={PAGE_BTN} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <button className={PAGE_BTN} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className={MODAL_OVERLAY} onClick={() => setModalOpen(false)}>
          <div className={MODAL} onClick={(e) => e.stopPropagation()}>
            <div className={MODAL_HEADER}>
              <h2>{editingId ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button className={MODAL_CLOSE} onClick={() => setModalOpen(false)} aria-label="Cerrar">
                <FiX />
              </button>
            </div>
            <form className={MODAL_BODY} onSubmit={handleSave}>
              <div className={FORM_GROUP}>
                <label>Nombre / Razón social *</label>
                <input value={form.name} onChange={handleField("name")} maxLength={120} />
              </div>
              <div className={FORM_ROW}>
                <div className={FORM_GROUP}>
                  <label>Cédula / RIF *</label>
                  <input value={form.cedula} onChange={handleField("cedula")} maxLength={20} />
                </div>
                <div className={FORM_GROUP}>
                  <label>Tipo</label>
                  <select value={form.type} onChange={handleField("type")}>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>
              </div>
              <div className={FORM_ROW}>
                <div className={FORM_GROUP}>
                  <label>Teléfono</label>
                  <input value={form.phone} onChange={handleField("phone")} maxLength={20} />
                </div>
                <div className={FORM_GROUP}>
                  <label>Dirección</label>
                  <input value={form.address} onChange={handleField("address")} maxLength={150} />
                </div>
              </div>
              <div className={FORM_ROW}>
                <div className={FORM_GROUP}>
                  <label>Límite de crédito ($)</label>
                  <input type="number" min="0" step="0.01" value={form.limiteCredito} onChange={handleField("limiteCredito")} />
                </div>
                <div className={FORM_GROUP}>
                  <label>Días de crédito</label>
                  <input type="number" min="0" value={form.diasCredito} onChange={handleField("diasCredito")} />
                </div>
              </div>
              <div className={MODAL_FOOTER}>
                <button type="button" className={BTN_MOD} onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={BTN_MOD_PRIMARY} disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
