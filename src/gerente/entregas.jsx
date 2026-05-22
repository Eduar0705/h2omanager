import { useState, useEffect } from 'react';
import {
    FiTruck, FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiX,
    FiMapPin, FiUser, FiClock, FiCheck, FiChevronLeft, FiChevronRight, FiPackage
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as entregaService from './services/entrega.service';
import * as clientService from './services/clientes.service';
import '../assets/css/modulos.css';

const STATUS_LABELS = {
    pendiente: 'Pendiente',
    en_camino: 'En Camino',
    completada: 'Completada',
    cancelada: 'Cancelada',
};

export default function Entregas() {
    const [entregas, setEntregas] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ clientId: '', address: '', items: '', notes: '' });
    const rowsPerPage = 8;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [data, cData] = await Promise.all([
                entregaService.getEntregas(),
                clientService.getClients()
            ]);
            setEntregas(data);
            setClients(cData);
        } catch (e) {
            Swal.fire('Error', 'No se pudieron cargar las entregas', 'error');
        } finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!form.clientId || !form.address) {
            Swal.fire('Campos requeridos', 'Selecciona un cliente y dirección', 'warning');
            return;
        }
        const client = clients.find(c => c.id == form.clientId);
        try {
            if (editingItem) {
                await entregaService.updateEntrega(editingItem.id, { ...form, clientName: client?.name });
            } else {
                await entregaService.addEntrega({ ...form, clientName: client?.name });
            }
            setShowModal(false); setEditingItem(null);
            setForm({ clientId: '', address: '', items: '', notes: '' });
            await loadData();
            Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: '¿Eliminar entrega?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar' });
        if (res.isConfirmed) { await entregaService.deleteEntrega(id); loadData(); }
    };

    const handleStatusChange = async (entrega, newStatus) => {
        await entregaService.updateEntrega(entrega.id, { status: newStatus });
        loadData();
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setForm({ clientId: item.clientId || '', address: item.address || '', items: item.items || '', notes: item.notes || '' });
        setShowModal(true);
    };

    // Filters
    const filtered = entregas.filter(e => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || e.id?.toLowerCase().includes(q) || e.clientName?.toLowerCase().includes(q) || e.address?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    // Stats
    const pending = entregas.filter(e => e.status === 'pendiente').length;
    const enCamino = entregas.filter(e => e.status === 'en_camino').length;
    const completed = entregas.filter(e => e.status === 'completada').length;

    return (
        <div className="module-container">
            <div className="module-header">
                <div className="title-section">
                    <h1>Entregas</h1>
                    <p>Gestión y seguimiento de entregas de pedidos</p>
                </div>
                <div className="module-header-actions">
                    <button className="btn-mod" onClick={loadData}><FiRefreshCw /> Actualizar</button>
                    <button className="btn-mod primary" onClick={() => { setEditingItem(null); setForm({ clientId: '', address: '', items: '', notes: '' }); setShowModal(true); }}>
                        <FiPlus /> Nueva Entrega
                    </button>
                </div>
            </div>

            <div className="mod-stats">
                <div className="mod-stat-card">
                    <div className="mod-stat-icon blue"><FiTruck /></div>
                    <div className="mod-stat-info"><p className="mod-val">{entregas.length}</p><p className="mod-lbl">Total Entregas</p></div>
                </div>
                <div className="mod-stat-card">
                    <div className="mod-stat-icon amber"><FiClock /></div>
                    <div className="mod-stat-info"><p className="mod-val">{pending}</p><p className="mod-lbl">Pendientes</p></div>
                </div>
                <div className="mod-stat-card">
                    <div className="mod-stat-icon cyan"><FiTruck /></div>
                    <div className="mod-stat-info"><p className="mod-val">{enCamino}</p><p className="mod-lbl">En Camino</p></div>
                </div>
                <div className="mod-stat-card">
                    <div className="mod-stat-icon green"><FiCheck /></div>
                    <div className="mod-stat-info"><p className="mod-val">{completed}</p><p className="mod-lbl">Completadas</p></div>
                </div>
            </div>

            <div className="mod-controls">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input className="search-input" placeholder="Buscar por ID, cliente o dirección..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_camino">En Camino</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                </select>
            </div>

            <div className="mod-table-wrap">
                {filtered.length === 0 ? (
                    <div className="mod-empty"><FiTruck /><h3>{isLoading ? 'Cargando...' : 'Sin entregas'}</h3><p>Crea tu primera entrega para comenzar</p></div>
                ) : (
                    <>
                        <table className="mod-table">
                            <thead><tr><th>ID</th><th>Cliente</th><th>Dirección</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {paginated.map(e => (
                                    <tr key={e.id}>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontSize: '13px' }}>{e.id}</span></td>
                                        <td>
                                            <div className="mod-cell-info">
                                                <div className="mod-avatar blue">{e.clientName?.charAt(0)?.toUpperCase() || '?'}</div>
                                                <div className="cell-text"><p style={{ fontWeight: 600 }}>{e.clientName || 'Sin cliente'}</p></div>
                                            </div>
                                        </td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><FiMapPin style={{ color: 'var(--accent)', flexShrink: 0 }} />{e.address || '—'}</div></td>
                                        <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{e.date ? new Date(e.date).toLocaleDateString('es-VE') : '—'}</td>
                                        <td>
                                            <select value={e.status} onChange={(ev) => handleStatusChange(e, ev.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'var(--surface)', outline: 'none' }}>
                                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <div className="mod-actions">
                                                <button onClick={() => openEdit(e)}><FiEdit2 /></button>
                                                <button className="del" onClick={() => handleDelete(e.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="mod-pagination">
                                <span>{(currentPage-1)*rowsPerPage+1}–{Math.min(currentPage*rowsPerPage, filtered.length)} de {filtered.length}</span>
                                <div className="page-btns">
                                    <button disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}><FiChevronLeft /></button>
                                    <button disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}><FiChevronRight /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className="mod-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="mod-modal" onClick={ev => ev.stopPropagation()}>
                        <div className="mod-modal-header">
                            <h2>{editingItem ? 'Editar Entrega' : 'Nueva Entrega'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <div className="mod-modal-body">
                            <div className="mod-form-group">
                                <label>Cliente</label>
                                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.cedula}</option>)}
                                </select>
                            </div>
                            <div className="mod-form-group">
                                <label>Dirección de Entrega</label>
                                <input placeholder="Dirección completa..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                            <div className="mod-form-group">
                                <label>Productos / Items</label>
                                <input placeholder="Ej: 3x Botellón 20L, 2x Botellón 10L" value={form.items} onChange={e => setForm({...form, items: e.target.value})} />
                            </div>
                            <div className="mod-form-group">
                                <label>Notas</label>
                                <textarea rows={3} placeholder="Observaciones adicionales..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                            </div>
                            <div className="mod-modal-footer">
                                <button className="btn-mod" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className="btn-mod primary" onClick={handleSave}><FiCheck /> Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
