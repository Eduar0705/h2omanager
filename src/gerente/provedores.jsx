import { useState, useEffect } from 'react';
import {
    FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2,
    FiPhone, FiCheck, FiChevronLeft, FiChevronRight, FiPackage, FiMapPin, FiUsers
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import ModFormModal from '../components/ModFormModal';
import * as proveedorService from './services/provedores.service';
import {
    MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD, BTN_MOD_PRIMARY,
    STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
    CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, FILTER_SELECT,
    TABLE_WRAP, TABLE, EMPTY, CELL_INFO, AVATAR_BASE, AVATAR_COLOR,
    BADGE, BADGE_VARIANT, ACTIONS, ACTION_BTN, ACTION_BTN_DEL,
    PAGINATION, PAGE_BTNS, PAGE_BTN, FORM_ROW, FORM_GROUP,
} from '../ui/mod';

const emptyProveedorForm = () => ({
    name: '', rif: '', phone: '', email: '', address: '', category: 'Agua', status: 'active',
});

export default function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyProveedorForm);
    const rowsPerPage = 8;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try { setProveedores(await proveedorService.getProveedores()); }
        catch { Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!form.name || !form.rif) { Swal.fire('Campos requeridos', 'Nombre y RIF son obligatorios', 'warning'); return; }
        if (!form.email?.trim()) { Swal.fire('Campos requeridos', 'El correo de contacto es obligatorio', 'warning'); return; }
        try {
            if (editingItem) { await proveedorService.updateProveedor(editingItem.id, form); }
            else { await proveedorService.addProveedor(form); }
            setShowModal(false); setEditingItem(null);
            setForm(emptyProveedorForm());
            await loadData();
            Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: '¿Eliminar proveedor?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar' });
        if (res.isConfirmed) { await proveedorService.deleteProveedor(id); loadData(); }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setForm({ name: item.name||'', rif: item.rif||'', phone: item.phone||'', email: item.email||'', address: item.address||'', category: item.category||'Agua', status: item.status||'active' });
        setShowModal(true);
    };

    const filtered = proveedores.filter(p => {
        const q = searchTerm.toLowerCase();
        const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.rif?.includes(q) || p.email?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginated = filtered.slice((currentPage-1)*rowsPerPage, currentPage*rowsPerPage);
    useEffect(()=>{setCurrentPage(1);},[searchTerm,statusFilter]);

    const activos = proveedores.filter(p=>p.status==='active').length;
    const COLORS = ['purple','cyan','amber','green','blue'];

    return (
        <div className={MODULE_CONTAINER}>
            <div className={MODULE_HEADER}>
                <div className="title-section"><h1>Proveedores</h1><p>Gestión de proveedores y distribuidores</p></div>
                <div className={HEADER_ACTIONS}>
                    <button className={BTN_MOD} onClick={loadData}><FiRefreshCw /> Actualizar</button>
                    <button className={BTN_MOD_PRIMARY} onClick={()=>{setEditingItem(null);setForm(emptyProveedorForm());setShowModal(true);}}>
                        <FiPlus /> Nuevo Proveedor
                    </button>
                </div>
            </div>

            <div className={STATS}>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.purple}`}><FiUsers /></div><div><p className={STAT_VAL}>{proveedores.length}</p><p className={STAT_LBL}>Total</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiCheck /></div><div><p className={STAT_VAL}>{activos}</p><p className={STAT_LBL}>Activos</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.red}`}><FiPackage /></div><div><p className={STAT_VAL}>{proveedores.length-activos}</p><p className={STAT_LBL}>Inactivos</p></div></div>
            </div>

            <div className={CONTROLS}>
                <div className={SEARCH_BOX}><FiSearch className={SEARCH_ICON} /><input className={SEARCH_INPUT} placeholder="Buscar por nombre, RIF o correo..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} /></div>
                <select className={FILTER_SELECT} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                    <option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
                </select>
            </div>

            <div className={TABLE_WRAP}>
                {filtered.length === 0 ? (
                    <div className={EMPTY}><FiPackage /><h3>{isLoading?'Cargando...':'Sin proveedores'}</h3><p>Registra un proveedor para comenzar</p></div>
                ) : (
                    <>
                        <table className={TABLE}>
                            <thead><tr><th>Proveedor</th><th>RIF</th><th>Teléfono</th><th>Dirección</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {paginated.map((p,i)=>(
                                    <tr key={p.id}>
                                        <td>
                                            <div className={CELL_INFO}>
                                                <div className={`${AVATAR_BASE} ${AVATAR_COLOR[COLORS[i%COLORS.length]]}`}>{p.name?.charAt(0)?.toUpperCase()||'?'}</div>
                                                <div className="cell-text"><p style={{fontWeight:600}}>{p.name}</p><p className="cell-sub">{p.email?.trim() ? p.email : 'Sin correo'}</p></div>
                                            </div>
                                        </td>
                                        <td style={{fontWeight:600,fontSize:'13px'}}>{p.rif||'—'}</td>
                                        <td><div style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'13px'}}><FiPhone style={{color:'var(--muted)',fontSize:'12px'}} />{p.phone||'—'}</div></td>
                                        <td style={{ maxWidth: '240px', fontSize: '13px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--muted)' }}>
                                                <FiMapPin style={{ flexShrink: 0, marginTop: '2px', fontSize: '14px' }} />
                                                <span title={p.address || ''}>{(p.address && p.address.trim()) ? p.address : '—'}</span>
                                            </div>
                                        </td>
                                        <td><span className={`${BADGE} ${BADGE_VARIANT[p.status] || BADGE_VARIANT.inactive}`}>{p.status==='active'?'Activo':'Inactivo'}</span></td>
                                        <td><div className={ACTIONS}><button className={ACTION_BTN} onClick={()=>openEdit(p)}><FiEdit2 /></button><button className={`${ACTION_BTN} ${ACTION_BTN_DEL}`} onClick={()=>handleDelete(p.id)}><FiTrash2 /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages>1&&(
                            <div className={PAGINATION}><span>{(currentPage-1)*rowsPerPage+1}–{Math.min(currentPage*rowsPerPage,filtered.length)} de {filtered.length}</span><div className={PAGE_BTNS}><button className={PAGE_BTN} disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)}><FiChevronLeft /></button><button className={PAGE_BTN} disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)}><FiChevronRight /></button></div></div>
                        )}
                    </>
                )}
            </div>

            <ModFormModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                footer={
                    <>
                        <button type="button" className={BTN_MOD} onClick={() => setShowModal(false)}>Cancelar</button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button>
                    </>
                }
            >
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Nombre / Razón Social</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del proveedor" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>RIF</label>
                        <input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-12345678-9" />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Teléfono</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0212-1234567" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Correo (contacto)</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@proveedor.com" />
                    </div>
                </div>
                <div className={FORM_GROUP}>
                    <label>Dirección</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección completa" />
                </div>
                <div className={FORM_GROUP}>
                    <label>Categoría</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option>Agua</option>
                        <option>Envases</option>
                        <option>Equipos</option>
                        <option>Insumos</option>
                        <option>Transporte</option>
                        <option>Otro</option>
                    </select>
                </div>
            </ModFormModal>
        </div>
    );
}
