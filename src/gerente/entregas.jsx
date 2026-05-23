import { useState, useEffect } from 'react';
import {
    FiTruck, FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiX,
    FiMapPin, FiClock, FiCheck, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as entregaService from './services/entrega.service';
import * as clientService from './services/clientes.service';
import {
    MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD, BTN_MOD_PRIMARY,
    STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
    CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, FILTER_SELECT,
    TABLE_WRAP, TABLE, EMPTY, CELL_INFO, AVATAR_BASE, AVATAR_COLOR,
    ACTIONS, ACTION_BTN, ACTION_BTN_DEL, PAGINATION, PAGE_BTNS, PAGE_BTN,
    MODAL_OVERLAY, MODAL, MODAL_HEADER, MODAL_CLOSE, MODAL_BODY, MODAL_FOOTER, FORM_GROUP,
} from '../ui/mod';

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
        } catch {
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

    const filtered = entregas.filter(e => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || e.id?.toLowerCase().includes(q) || e.clientName?.toLowerCase().includes(q) || e.address?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const pending = entregas.filter(e => e.status === 'pendiente').length;
    const enCamino = entregas.filter(e => e.status === 'en_camino').length;
    const completed = entregas.filter(e => e.status === 'completada').length;

    return (
        <div className={MODULE_CONTAINER}>
            <div className={MODULE_HEADER}>
                <div className="title-section">
                    <h1>Entregas</h1>
                    <p>Gestión y seguimiento de entregas de pedidos</p>
                </div>
                <div className={HEADER_ACTIONS}>
                    <button className={BTN_MOD} onClick={loadData}><FiRefreshCw /> Actualizar</button>
                    <button className={BTN_MOD_PRIMARY} onClick={() => { setEditingItem(null); setForm({ clientId: '', address: '', items: '', notes: '' }); setShowModal(true); }}>
                        <FiPlus /> Nueva Entrega
                    </button>
                </div>
            </div>

            <div className={STATS}>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.blue}`}><FiTruck /></div><div><p className={STAT_VAL}>{entregas.length}</p><p className={STAT_LBL}>Total Entregas</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.amber}`}><FiClock /></div><div><p className={STAT_VAL}>{pending}</p><p className={STAT_LBL}>Pendientes</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.cyan}`}><FiTruck /></div><div><p className={STAT_VAL}>{enCamino}</p><p className={STAT_LBL}>En Camino</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiCheck /></div><div><p className={STAT_VAL}>{completed}</p><p className={STAT_LBL}>Completadas</p></div></div>
            </div>

            <div className={CONTROLS}>
                <div className={SEARCH_BOX}>
                    <FiSearch className={SEARCH_ICON} />
                    <input className={SEARCH_INPUT} placeholder="Buscar por ID, cliente o dirección..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className={FILTER_SELECT} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_camino">En Camino</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                </select>
            </div>

            <div className={TABLE_WRAP}>
                {filtered.length === 0 ? (
                    <div className={EMPTY}><FiTruck /><h3>{isLoading ? 'Cargando...' : 'Sin entregas'}</h3><p>Crea tu primera entrega para comenzar</p></div>
                ) : (
                    <>
                        <table className={TABLE}>
                            <thead><tr><th>ID</th><th>Cliente</th><th>Dirección</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {paginated.map(e => (
                                    <tr key={e.id}>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontSize: '13px' }}>{e.id}</span></td>
                                        <td>
                                            <div className={CELL_INFO}>
                                                <div className={`${AVATAR_BASE} ${AVATAR_COLOR.blue}`}>{e.clientName?.charAt(0)?.toUpperCase() || '?'}</div>
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
                                            <div className={ACTIONS}>
                                                <button className={ACTION_BTN} onClick={() => openEdit(e)}><FiEdit2 /></button>
                                                <button className={`${ACTION_BTN} ${ACTION_BTN_DEL}`} onClick={() => handleDelete(e.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className={PAGINATION}>
                                <span>{(currentPage-1)*rowsPerPage+1}–{Math.min(currentPage*rowsPerPage, filtered.length)} de {filtered.length}</span>
                                <div className={PAGE_BTNS}>
                                    <button className={PAGE_BTN} disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}><FiChevronLeft /></button>
                                    <button className={PAGE_BTN} disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}><FiChevronRight /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className={MODAL_OVERLAY} onClick={() => setShowModal(false)}>
                    <div className={MODAL} onClick={ev => ev.stopPropagation()}>
                        <div className={MODAL_HEADER}>
                            <h2>{editingItem ? 'Editar Entrega' : 'Nueva Entrega'}</h2>
                            <button className={MODAL_CLOSE} onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <div className={MODAL_BODY}>
                            <div className={FORM_GROUP}>
                                <label>Cliente</label>
                                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                                    <option value="">Seleccionar cliente...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.cedula}</option>)}
                                </select>
                            </div>
                            <div className={FORM_GROUP}>
                                <label>Dirección de Entrega</label>
                                <input placeholder="Dirección completa..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label>Productos / Items</label>
                                <input placeholder="Ej: 3x Botellón 20L, 2x Botellón 10L" value={form.items} onChange={e => setForm({...form, items: e.target.value})} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label>Notas</label>
                                <textarea rows={3} placeholder="Observaciones adicionales..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                            </div>
                            <div className={MODAL_FOOTER}>
                                <button className={BTN_MOD} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
