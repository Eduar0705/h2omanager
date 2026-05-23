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
import "../assets/css/modulos.css";

const STATUS_BADGE = {
  active: { cls: "active", label: "Al día" },
  delinquent: { cls: "pendiente", label: "Con saldo" },
  overlimit: { cls: "cancelada", label: "Sobre límite" },
};

const EMPTY_FORM = {
  name: "",
  cedula: "",
  phone: "",
  address: "",
  type: "Residencial",
  limiteCredito: "",
  diasCredito: "",
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

  const handleField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
    <div className="module-container">
      <div className="module-header">
        <div className="title-section">
          <h1>Clientes</h1>
          <p>Consulta y registra clientes</p>
        </div>
        <div className="module-header-actions">
          <button className="btn-mod" onClick={loadData} disabled={isLoading}>
            <FiRefreshCw className={isLoading ? "spin" : ""} /> Actualizar
          </button>
          <button className="btn-mod primary" onClick={openCreate}>
            <FiPlus /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="mod-stats">
        <div className="mod-stat-card">
          <div className="mod-stat-icon blue"><FiUsers /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.total}</p>
            <p className="mod-lbl">Clientes</p>
          </div>
        </div>
        <div className="mod-stat-card">
          <div className="mod-stat-icon green"><FiUserCheck /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.alDia}</p>
            <p className="mod-lbl">Al día</p>
          </div>
        </div>
        <div className="mod-stat-card">
          <div className="mod-stat-icon amber"><FiAlertTriangle /></div>
          <div className="mod-stat-info">
            <p className="mod-val">{stats.conSaldo}</p>
            <p className="mod-lbl">Con saldo</p>
          </div>
        </div>
      </div>

      <div className="mod-controls">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mod-table-wrap">
        {filtered.length === 0 ? (
          <div className="mod-empty">
            <FiUsers />
            <h3>{isLoading ? "Cargando..." : "Sin clientes"}</h3>
            <p>{isLoading ? "Obteniendo datos de la API" : "No hay clientes para la búsqueda"}</p>
          </div>
        ) : (
          <>
            <table className="mod-table">
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
                        <span className={`mod-badge ${st.cls}`}>{st.label}</span>
                      </td>
                      <td>
                        <div className="mod-actions" style={{ justifyContent: "flex-end" }}>
                          <button title="Editar" onClick={() => openEdit(c)}>
                            <FiEdit2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mod-pagination">
              <span>
                {(page - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(page * ROWS_PER_PAGE, filtered.length)} de {filtered.length}
              </span>
              <div className="page-btns">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="mod-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal-header">
              <h2>{editingId ? "Editar cliente" : "Nuevo cliente"}</h2>
              <button className="btn-close" onClick={() => setModalOpen(false)} aria-label="Cerrar">
                <FiX />
              </button>
            </div>
            <form className="mod-modal-body" onSubmit={handleSave}>
              <div className="mod-form-group">
                <label>Nombre / Razón social *</label>
                <input value={form.name} onChange={handleField("name")} maxLength={120} />
              </div>
              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label>Cédula / RIF *</label>
                  <input value={form.cedula} onChange={handleField("cedula")} maxLength={20} />
                </div>
                <div className="mod-form-group">
                  <label>Tipo</label>
                  <select value={form.type} onChange={handleField("type")}>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>
              </div>
              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label>Teléfono</label>
                  <input value={form.phone} onChange={handleField("phone")} maxLength={20} />
                </div>
                <div className="mod-form-group">
                  <label>Dirección</label>
                  <input value={form.address} onChange={handleField("address")} maxLength={150} />
                </div>
              </div>
              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label>Límite de crédito ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.limiteCredito}
                    onChange={handleField("limiteCredito")}
                  />
                </div>
                <div className="mod-form-group">
                  <label>Días de crédito</label>
                  <input
                    type="number"
                    min="0"
                    value={form.diasCredito}
                    onChange={handleField("diasCredito")}
                  />
                </div>
              </div>
              <div className="mod-modal-footer">
                <button type="button" className="btn-mod" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-mod primary" disabled={saving}>
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
