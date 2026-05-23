import { useState, useEffect } from 'react';
import {
    FiTool, FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiX,
    FiCheck, FiChevronLeft, FiChevronRight, FiClock
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as servicioService from './services/servicios.service';
import * as clientService from './services/clientes.service';
import {
    MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD, BTN_MOD_PRIMARY,
    STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
    CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, FILTER_SELECT,
    TABLE_WRAP, TABLE, EMPTY, BADGE, ACTIONS, ACTION_BTN, ACTION_BTN_DEL,
    PAGINATION, PAGE_BTNS, PAGE_BTN, MODAL_OVERLAY, MODAL, MODAL_HEADER,
    MODAL_CLOSE, MODAL_BODY, MODAL_FOOTER, FORM_ROW, FORM_GROUP,
} from '../ui/mod';

const STATUS_LABELS = { pendiente: 'Pendiente', en_proceso: 'En Proceso', completado: 'Completado', cancelado: 'Cancelado' };
const TIPOS = ['Mantenimiento Preventivo', 'Mantenimiento Correctivo', 'Instalación', 'Inspección', 'Reparación', 'Sanitización'];

export default function Servicios() {
    const [servicios, setServicios] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ clientId: '', tipo: TIPOS[0], description: '', priority: 'normal', notes: '' });
    const rowsPerPage = 8;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [sData, cData] = await Promise.all([servicioService.getServicios(), clientService.getClients()]);
            setServicios(sData); setClients(cData);
        } catch { Swal.fire('Error', 'No se pudieron cargar los servicios', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!form.tipo) { Swal.fire('Campo requerido', 'Selecciona un tipo de servicio', 'warning'); return; }
        const client = clients.find(c => c.id == form.clientId);
        try {
            if (editingItem) { await servicioService.updateServicio(editingItem.id, { ...form, clientName: client?.name || 'General' }); }
            else { await servicioService.addServicio({ ...form, clientName: client?.name || 'General' }); }
            setShowModal(false); setEditingItem(null);
            setForm({ clientId: '', tipo: TIPOS[0], description: '', priority: 'normal', notes: '' });
            await loadData();
            Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: '¿Eliminar servicio?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar' });
        if (res.isConfirmed) { await servicioService.deleteServicio(id); loadData(); }
    };

    const handleStatusChange = async (srv, newStatus) => {
        await servicioService.updateServicio(srv.id, { status: newStatus });
        loadData();
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setForm({ clientId: item.clientId || '', tipo: item.tipo || TIPOS[0], description: item.description || '', priority: item.priority || 'normal', notes: item.notes || '' });
        setShowModal(true);
    };

    const filtered = servicios.filter(s => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || s.id?.toLowerCase().includes(q) || s.clientName?.toLowerCase().includes(q) || s.tipo?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginated = filtered.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage);
    useEffect(()=>{setCurrentPage(1);},[searchTerm,statusFilter]);

    const pending = servicios.filter(s=>s.status==='pendiente').length;
    const inProgress = servicios.filter(s=>s.status==='en_proceso').length;
    const completed = servicios.filter(s=>s.status==='completado').length;

    const priorityColor = (p) => p === 'alta' ? { bg: '#fee2e2', color: '#991b1b' } : p === 'media' ? { bg: '#fef3c7', color: '#92400e' } : { bg: '#f1f5f9', color: '#475569' };

    return (
        <div className={MODULE_CONTAINER}>
            <div className={MODULE_HEADER}>
                <div className="title-section"><h1>Servicios</h1><p>Gestión de servicios técnicos y mantenimiento</p></div>
                <div className={HEADER_ACTIONS}>
                    <button className={BTN_MOD} onClick={loadData}><FiRefreshCw /> Actualizar</button>
                    <button className={BTN_MOD_PRIMARY} onClick={()=>{setEditingItem(null);setForm({clientId:'',tipo:TIPOS[0],description:'',priority:'normal',notes:''});setShowModal(true);}}>
                        <FiPlus /> Nuevo Servicio
                    </button>
                </div>
            </div>

            <div className={STATS}>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.blue}`}><FiTool /></div><div><p className={STAT_VAL}>{servicios.length}</p><p className={STAT_LBL}>Total</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.amber}`}><FiClock /></div><div><p className={STAT_VAL}>{pending}</p><p className={STAT_LBL}>Pendientes</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.cyan}`}><FiTool /></div><div><p className={STAT_VAL}>{inProgress}</p><p className={STAT_LBL}>En Proceso</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiCheck /></div><div><p className={STAT_VAL}>{completed}</p><p className={STAT_LBL}>Completados</p></div></div>
            </div>

            <div className={CONTROLS}>
                <div className={SEARCH_BOX}><FiSearch className={SEARCH_ICON} /><input className={SEARCH_INPUT} placeholder="Buscar por ID, cliente o tipo..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
                <select className={FILTER_SELECT} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="pendiente">Pendiente</option><option value="en_proceso">En Proceso</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option>
                </select>
            </div>

            <div className={TABLE_WRAP}>
                {filtered.length === 0 ? (
                    <div className={EMPTY}><FiTool /><h3>{isLoading?'Cargando...':'Sin servicios'}</h3><p>Registra un servicio para comenzar</p></div>
                ) : (
                    <>
                        <table className={TABLE}>
                            <thead><tr><th>ID</th><th>Tipo</th><th>Cliente</th><th>Prioridad</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {paginated.map(s => {
                                    const pc = priorityColor(s.priority);
                                    return (
                                        <tr key={s.id}>
                                            <td><span style={{fontFamily:'monospace',fontWeight:700,color:'var(--accent)',background:'#eff6ff',padding:'3px 8px',borderRadius:'6px',fontSize:'13px'}}>{s.id}</span></td>
                                            <td><span className={BADGE} style={{background:'#ecfeff',color:'#0e7490'}}>{s.tipo}</span></td>
                                            <td style={{fontWeight:600,fontSize:'13px'}}>{s.clientName || 'General'}</td>
                                            <td><span className={BADGE} style={{background:pc.bg,color:pc.color}}>{s.priority === 'alta' ? '🔴 Alta' : s.priority === 'media' ? '🟡 Media' : '⚪ Normal'}</span></td>
                                            <td style={{fontSize:'13px',color:'var(--muted)'}}>{s.date ? new Date(s.date).toLocaleDateString('es-VE') : '—'}</td>
                                            <td>
                                                <select value={s.status} onChange={ev=>handleStatusChange(s,ev.target.value)} style={{padding:'4px 8px',borderRadius:'8px',border:'1px solid var(--border)',fontSize:'12px',fontWeight:600,cursor:'pointer',background:'var(--surface)',outline:'none'}}>
                                                    {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </td>
                                            <td><div className={ACTIONS}><button className={ACTION_BTN} onClick={()=>openEdit(s)}><FiEdit2 /></button><button className={`${ACTION_BTN} ${ACTION_BTN_DEL}`} onClick={()=>handleDelete(s.id)}><FiTrash2 /></button></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {totalPages>1&&(<div className={PAGINATION}><span>{(currentPage-1)*rowsPerPage+1}–{Math.min(currentPage*rowsPerPage,filtered.length)} de {filtered.length}</span><div className={PAGE_BTNS}><button className={PAGE_BTN} disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}><FiChevronLeft /></button><button className={PAGE_BTN} disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}><FiChevronRight /></button></div></div>)}
                    </>
                )}
            </div>

            {showModal && (
                <div className={MODAL_OVERLAY} onClick={()=>setShowModal(false)}>
                    <div className={MODAL} onClick={ev=>ev.stopPropagation()}>
                        <div className={MODAL_HEADER}><h2>{editingItem?'Editar Servicio':'Nuevo Servicio'}</h2><button className={MODAL_CLOSE} onClick={()=>setShowModal(false)}><FiX /></button></div>
                        <div className={MODAL_BODY}>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}><label>Tipo de Servicio</label>
                                    <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                                        {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={FORM_GROUP}><label>Prioridad</label>
                                    <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                                        <option value="normal">Normal</option><option value="media">Media</option><option value="alta">Alta</option>
                                    </select>
                                </div>
                            </div>
                            <div className={FORM_GROUP}><label>Cliente (Opcional)</label>
                                <select value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})}>
                                    <option value="">General / Sin cliente</option>
                                    {clients.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cedula}</option>)}
                                </select>
                            </div>
                            <div className={FORM_GROUP}><label>Descripción</label><textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Descripción del servicio..." /></div>
                            <div className={FORM_GROUP}><label>Notas</label><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Observaciones adicionales..." /></div>
                            <div className={MODAL_FOOTER}><button className={BTN_MOD} onClick={()=>setShowModal(false)}>Cancelar</button><button className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
