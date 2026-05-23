import { useState, useEffect } from 'react';
import {
    FiUserCheck, FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiCheck,
    FiChevronLeft, FiChevronRight, FiUsers, FiMapPin,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import ModFormModal from '../components/ModFormModal';
import * as empleadoService from './services/empleados.service';
import {
    MODULE_CONTAINER, MODULE_HEADER, HEADER_ACTIONS, BTN_MOD, BTN_MOD_PRIMARY,
    STATS, STAT_CARD, STAT_ICON, STAT_ICON_BASE, STAT_VAL, STAT_LBL,
    CONTROLS, SEARCH_BOX, SEARCH_ICON, SEARCH_INPUT, FILTER_SELECT,
    TABLE_WRAP, TABLE, EMPTY, CELL_INFO, AVATAR_BASE, AVATAR_COLOR,
    BADGE, BADGE_VARIANT, ACTIONS, ACTION_BTN, ACTION_BTN_DEL,
    PAGINATION, PAGE_BTNS, PAGE_BTN, FORM_ROW, FORM_GROUP,
} from '../ui/mod';

const emptyForm = () => ({ name: '', cedula: '', email: '', password: '', rolId: '2', sucursalId: '1' });

export default function Empleados() {
    const [empleados, setEmpleados] = useState([]);
    const [sucursales, setSucursales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const rowsPerPage = 8;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [lista, suc] = await Promise.all([
                empleadoService.getEmpleados(),
                empleadoService.getSucursales(),
            ]);
            setEmpleados(lista);
            setSucursales(suc);
        } catch {
            Swal.fire('Error', 'No se pudieron cargar los empleados', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const resolveRolId = (item) => empleadoService.ROL_OPCIONES.find((r) => r.nombre === item.role)?.id ?? 2;
    const resolveSucursalId = (item) => sucursales.find((s) => s.nombre === item.sucursal)?.id ?? sucursales[0]?.id ?? 1;

    const handleSave = async () => {
        if (!form.name?.trim() || !form.cedula?.trim() || !form.email?.trim()) {
            Swal.fire('Campos requeridos', 'Nombre, cédula y correo son obligatorios', 'warning');
            return;
        }
        if (!editingItem && (!form.password || form.password.length < 8)) {
            Swal.fire('Contraseña', 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números (requisito de la API).', 'warning');
            return;
        }
        try {
            if (editingItem) {
                await empleadoService.updateEmpleado(editingItem.id, form);
            } else {
                await empleadoService.addEmpleado(form);
            }
            setShowModal(false);
            setEditingItem(null);
            setForm(emptyForm());
            await loadData();
            Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', e.message || 'No se pudo guardar', 'error');
        }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: '¿Eliminar usuario?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar' });
        if (res.isConfirmed) {
            try {
                await empleadoService.deleteEmpleado(id);
                await loadData();
            } catch (e) {
                Swal.fire('Error', e.message || 'No se pudo eliminar', 'error');
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setForm({
            name: item.name || '',
            cedula: item.cedula || '',
            email: item.email || '',
            password: '',
            rolId: String(resolveRolId(item)),
            sucursalId: String(resolveSucursalId(item)),
        });
        setShowModal(true);
    };

    const filtered = empleados.filter((e) => {
        const q = searchTerm.toLowerCase();
        const matchSearch =
            !q ||
            e.name?.toLowerCase().includes(q) ||
            e.cedula?.includes(q) ||
            e.email?.toLowerCase().includes(q) ||
            e.sucursal?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const activos = empleados.filter((e) => e.status === 'active').length;
    const COLORS = ['blue', 'green', 'purple', 'amber', 'cyan'];

    return (
        <div className={MODULE_CONTAINER}>
            <div className={MODULE_HEADER}>
                <div className="title-section">
                    <h1>Empleados</h1>
                    <p>Gestión del personal (usuarios del sistema)</p>
                </div>
                <div className={HEADER_ACTIONS}>
                    <button className={BTN_MOD} onClick={loadData}><FiRefreshCw /> Actualizar</button>
                    <button
                        className={BTN_MOD_PRIMARY}
                        onClick={() => {
                            setEditingItem(null);
                            setForm({ ...emptyForm(), sucursalId: String(sucursales[0]?.id ?? 1) });
                            setShowModal(true);
                        }}
                    >
                        <FiPlus /> Nuevo empleado
                    </button>
                </div>
            </div>

            <div className={STATS}>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.blue}`}><FiUsers /></div><div><p className={STAT_VAL}>{empleados.length}</p><p className={STAT_LBL}>Total</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.green}`}><FiUserCheck /></div><div><p className={STAT_VAL}>{activos}</p><p className={STAT_LBL}>Activos</p></div></div>
                <div className={STAT_CARD}><div className={`${STAT_ICON_BASE} ${STAT_ICON.red}`}><FiUserCheck /></div><div><p className={STAT_VAL}>{empleados.length - activos}</p><p className={STAT_LBL}>Inactivos</p></div></div>
            </div>

            <div className={CONTROLS}>
                <div className={SEARCH_BOX}>
                    <FiSearch className={SEARCH_ICON} />
                    <input className={SEARCH_INPUT} placeholder="Buscar por nombre, cédula, correo o sucursal..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className={FILTER_SELECT} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                </select>
            </div>

            <div className={TABLE_WRAP}>
                {filtered.length === 0 ? (
                    <div className={EMPTY}>
                        <FiUsers />
                        <h3>{isLoading ? 'Cargando...' : 'Sin empleados'}</h3>
                        <p>Agrega un usuario del sistema para comenzar</p>
                    </div>
                ) : (
                    <>
                        <table className={TABLE}>
                            <thead>
                                <tr>
                                    <th>Empleado</th><th>Cédula</th><th>Sucursal</th><th>Rol</th><th>Estado</th><th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((e, i) => (
                                    <tr key={e.id}>
                                        <td>
                                            <div className={CELL_INFO}>
                                                <div className={`${AVATAR_BASE} ${AVATAR_COLOR[COLORS[i % COLORS.length]]}`}>
                                                    {(e.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="cell-text">
                                                    <p style={{ fontWeight: 600 }}>{e.name}</p>
                                                    <p className="cell-sub">{e.email || '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{e.cedula || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                                <FiMapPin style={{ color: 'var(--muted)' }} />
                                                {e.sucursal || '—'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={BADGE} style={{ background: '#eff6ff', color: '#1d4ed8' }}>{e.role}</span>
                                        </td>
                                        <td>
                                            <span className={`${BADGE} ${BADGE_VARIANT[e.status] || BADGE_VARIANT.inactive}`}>{e.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                                        </td>
                                        <td>
                                            <div className={ACTIONS}>
                                                <button type="button" className={ACTION_BTN} onClick={() => openEdit(e)}><FiEdit2 /></button>
                                                <button type="button" className={`${ACTION_BTN} ${ACTION_BTN_DEL}`} onClick={() => handleDelete(e.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className={PAGINATION}>
                                <span>{(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filtered.length)} de {filtered.length}</span>
                                <div className={PAGE_BTNS}>
                                    <button type="button" className={PAGE_BTN} disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><FiChevronLeft /></button>
                                    <button type="button" className={PAGE_BTN} disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}><FiChevronRight /></button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ModFormModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? 'Editar empleado' : 'Nuevo empleado'}
                wide
                footer={
                    <>
                        <button type="button" className={BTN_MOD} onClick={() => setShowModal(false)}>Cancelar</button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button>
                    </>
                }
            >
                <p className="mb-3 text-[13px] text-muted">Usuario del sistema (tabla usuario en la API).</p>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Nombre completo</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre y apellido" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Cédula</label>
                        <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="V-12345678" />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Correo</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>{editingItem ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
                        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingItem ? 'Vacío = sin cambio' : 'Mín. 8 caracteres'} autoComplete="new-password" />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Rol</label>
                        <select value={form.rolId} onChange={(e) => setForm({ ...form, rolId: e.target.value })}>
                            {empleadoService.ROL_OPCIONES.map((r) => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Sucursal</label>
                        <select value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}>
                            {sucursales.map((s) => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </ModFormModal>
        </div>
    );
}
