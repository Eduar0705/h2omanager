import { useState, useEffect, useMemo } from 'react';
import {
    FiMap, FiRefreshCw, FiX,
    FiCheck, FiTruck, FiClock, FiUsers,
    FiDownload, FiNavigation, FiAlertTriangle,
    FiMaximize2, FiUser, FiTrash2
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as rutaService from './services/rutas.service';
import * as empleadoService from './services/empleados.service';
import { MODAL_OVERLAY, MODAL, MODAL_HEADER, MODAL_CLOSE, MODAL_BODY, MODAL_FOOTER, FORM_GROUP, FORM_ROW, BTN_MOD, BTN_MOD_PRIMARY } from '../ui/mod';

const STATUS_MAP = {
    en_reparto: 'En Reparto',
    pendiente: 'Pendiente',
    cargando: 'Cargando',
    completada: 'Completada',
    cancelada: 'Cancelada',
};

const STATUS_BADGE = {
    en_reparto: 'bg-[#dcfce7] text-[#166534]',
    pendiente: 'bg-[#fef3c7] text-[#92400e]',
    cargando: 'bg-[#dbeafe] text-[#1e40af]',
    completada: 'bg-[#f0fdf4] text-[#15803d]',
    cancelada: 'bg-[#fee2e2] text-[#991b1b]',
};

const STAT_ICON = {
    blue: 'bg-[#eff6ff] text-[#3b82f6]',
    green: 'bg-[#f0fdf4] text-[#22c55e]',
    amber: 'bg-[#fffbeb] text-[#f59e0b]',
    purple: 'bg-[#faf5ff] text-[#a855f7]',
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const BTN_RUT = 'flex items-center gap-2 rounded-[10px] border border-border bg-white px-5 py-2.5 text-[13px] font-semibold text-text transition hover:-translate-y-0.5 hover:border-accent hover:text-accent max-md:flex-1 max-md:justify-center';
const BTN_RUT_PRIMARY = 'flex items-center gap-2 rounded-[10px] border border-accent bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,119,204,0.25)] transition hover:bg-[#0066b3] max-md:flex-1 max-md:justify-center';
const BTN_CARD = 'flex items-center gap-1.5 rounded-[10px] border border-border bg-white px-[18px] py-2 text-[13px] font-semibold text-text transition hover:border-accent hover:text-accent';
const BTN_CARD_PRIMARY = 'flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-[18px] py-2 text-[13px] font-semibold text-white transition hover:bg-[#0066b3]';
const BTN_CARD_WARN = 'flex items-center gap-1.5 rounded-[10px] border border-[#3b82f6] bg-[#3b82f6] px-[18px] py-2 text-[13px] font-semibold text-white transition';
const BTN_CARD_DEL = 'flex items-center gap-1.5 rounded-[10px] border border-[#fecaca] bg-white px-[18px] py-2 text-[13px] font-semibold text-[#ef4444] transition hover:bg-[#fef2f2]';
const DETAIL_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';

export default function Rutas() {
    const [rutas, setRutas] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [sortBy, setSortBy] = useState('time');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        name: '', zone: '', day: 'Lunes', driver: '', vehicle: '',
        totalStops: 15, completedStops: 0, botellones: 0, status: 'pendiente',
        startTime: '08:00', endTime: '16:00'
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rData, eData] = await Promise.all([
                rutaService.getRutas(),
                empleadoService.getEmpleados()
            ]);
            setRutas(rData); setEmpleados(eData);
        } catch { Swal.fire('Error', 'No se pudieron cargar las rutas', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleSave = async () => {
        if (!form.name || !form.zone) { Swal.fire('Campos requeridos', 'Nombre y zona son obligatorios', 'warning'); return; }
        try {
            const id = `RT-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`;
            if (editingItem) { await rutaService.updateRuta(editingItem.id, form); }
            else { await rutaService.addRuta({ ...form, routeId: id }); }
            closeModal();
            await loadData();
            Swal.fire({ icon: 'success', title: '¡Guardado!', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    };

    const handleDelete = async (id) => {
        const res = await Swal.fire({ title: '¿Eliminar ruta?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar' });
        if (res.isConfirmed) { await rutaService.deleteRuta(id); loadData(); }
    };

    const handleStatusChange = async (ruta, newStatus) => {
        await rutaService.updateRuta(ruta.id, { status: newStatus });
        loadData();
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setForm({
            name: item.name || '', zone: item.zone || '', day: item.day || 'Lunes',
            driver: item.driver || '', vehicle: item.vehicle || '',
            totalStops: item.totalStops || 15, completedStops: item.completedStops || 0,
            botellones: item.botellones || 0, status: item.status || 'pendiente',
            startTime: item.startTime || '08:00', endTime: item.endTime || '16:00'
        });
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingItem(null); setForm({ name:'',zone:'',day:'Lunes',driver:'',vehicle:'',totalStops:15,completedStops:0,botellones:0,status:'pendiente',startTime:'08:00',endTime:'16:00' }); };

    const filtered = useMemo(() => {
        let items = [...rutas];
        if (tab === 'en_reparto') items = items.filter(r => r.status === 'en_reparto' || r.status === 'cargando');
        else if (tab === 'completada') items = items.filter(r => r.status === 'completada');
        if (sortBy === 'time') items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        else if (sortBy === 'name') items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return items;
    }, [rutas, tab, sortBy]);

    const activeCount = rutas.filter(r => r.status === 'en_reparto' || r.status === 'cargando').length;
    const completedCount = rutas.filter(r => r.status === 'completada').length;
    const pendingCount = rutas.filter(r => r.status === 'pendiente').length;
    const driversSet = new Set(rutas.map(r => r.driver).filter(Boolean));
    const activeRoute = rutas.find(r => r.status === 'en_reparto') || rutas[0];

    return (
        <div className="animate-fade-up p-2.5">
            {/* HEADER */}
            <div className="mb-7 flex items-start justify-between max-md:flex-col max-md:gap-4">
                <div>
                    <h1 className="font-display text-[28px] text-text">Rutas de Reparto</h1>
                    <p className="mt-1 text-sm text-muted">Gestiona y optimiza las rutas de entrega diarias</p>
                </div>
                <div className="flex gap-2.5 max-md:w-full">
                    <button className={BTN_RUT} onClick={loadData}><FiRefreshCw className={isLoading ? 'animate-spin' : ''} /></button>
                    <button className={BTN_RUT} onClick={() => {}}><FiDownload /> Exportar</button>
                    <button className={BTN_RUT_PRIMARY} onClick={() => { closeModal(); setShowModal(true); }}>
                        <FiNavigation /> Nueva Ruta
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div className="mb-7 grid grid-cols-4 gap-4 max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
                {[
                    { icon: FiTruck, color: 'blue', label: 'Rutas Activas', value: activeCount },
                    { icon: FiCheck, color: 'green', label: 'Completadas', value: completedCount },
                    { icon: FiClock, color: 'amber', label: 'Pendientes', value: pendingCount },
                    { icon: FiUsers, color: 'purple', label: 'Conductores', value: driversSet.size },
                ].map(({ icon: Icon, color, label, value }) => (
                    <div key={label} className="flex items-center gap-4 rounded-2xl border border-border bg-white px-6 py-[22px] transition hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                        <div className={`flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-full text-[22px] ${STAT_ICON[color]}`}><Icon /></div>
                        <div>
                            <p className="text-[13px] font-medium text-muted">{label}</p>
                            <p className="mt-0.5 font-display text-[28px] font-extrabold leading-none text-text">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-[1fr_360px] items-start gap-5 max-[1024px]:grid-cols-1">
                {/* LEFT: Routes list */}
                <div>
                    <div className="mb-[18px] flex flex-wrap items-center gap-1.5">
                        {[{ id: 'all', label: 'Todas' }, { id: 'en_reparto', label: 'En Progreso' }, { id: 'completada', label: 'Completadas' }].map(t => (
                            <button
                                key={t.id}
                                className={`cursor-pointer rounded-[10px] border px-[18px] py-2 text-[13px] font-semibold transition ${
                                    tab === t.id
                                        ? 'border-accent bg-accent text-white'
                                        : 'border-border bg-white text-muted hover:border-accent hover:text-accent'
                                }`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                        <div className="ml-auto flex items-center gap-1.5 text-[13px] text-muted">
                            <FiClock size={14} /> Ordenar por:
                            <select className="cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] outline-none" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="time">Hora de inicio</option>
                                <option value="name">Nombre</option>
                            </select>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="px-5 py-[60px] text-center text-muted">
                            <FiMap className="mx-auto mb-3 text-[44px] opacity-30" />
                            <h3 className="mb-1.5 text-[17px] text-text">{isLoading ? 'Cargando...' : 'Sin rutas'}</h3>
                            <p className="text-sm">Crea una ruta para comenzar</p>
                        </div>
                    ) : (
                        filtered.map((ruta, i) => {
                            const progress = ruta.totalStops > 0 ? Math.round((ruta.completedStops / ruta.totalStops) * 100) : 0;
                            const noDriver = !ruta.driver;
                            return (
                                <div key={ruta.id} className="mb-4 rounded-2xl border border-border bg-white p-6 transition hover:border-[#c7d2fe] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                                    <div className="mb-[18px] flex items-start justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] font-display text-lg font-extrabold text-[#3b82f6]">R{i + 1}</div>
                                            <div>
                                                <h3 className="font-display text-base text-text">{ruta.name} - {ruta.zone}</h3>
                                                <p className="mt-0.5 text-xs text-muted">ID: #{ruta.routeId || ruta.id}</p>
                                            </div>
                                        </div>
                                        <span className={`whitespace-nowrap rounded-[20px] px-3.5 py-[5px] text-xs font-bold ${STATUS_BADGE[ruta.status] || 'bg-[#f1f5f9] text-[#475569]'}`}>
                                            {STATUS_MAP[ruta.status] || ruta.status}
                                        </span>
                                    </div>

                                    <div className="mb-4 grid grid-cols-4 gap-1 max-[768px]:grid-cols-2 max-[768px]:gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span className={DETAIL_LABEL}>Conductor</span>
                                            <span className={`flex items-center gap-1 text-sm font-semibold ${noDriver ? 'text-[#ef4444]' : 'text-text'}`}>
                                                {noDriver ? <><FiAlertTriangle size={13} /> Sin Asignar</> : <><FiUser size={13} /> {ruta.driver}</>}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className={DETAIL_LABEL}>Vehículo</span>
                                            <span className="flex items-center gap-1 text-sm font-semibold text-text"><FiTruck size={13} /> {ruta.vehicle || '—'}</span>
                                        </div>
                                        {ruta.status === 'en_reparto' ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className={DETAIL_LABEL}>Progreso</span>
                                                <span className="flex items-center gap-1 text-sm font-semibold text-text">{ruta.completedStops}/{ruta.totalStops} Entregas</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0.5">
                                                <span className={DETAIL_LABEL}>Botellones</span>
                                                <span className="flex items-center gap-1 text-sm font-semibold text-text">{ruta.botellones || 0} Unidades</span>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-0.5">
                                            <span className={DETAIL_LABEL}>{ruta.status === 'en_reparto' ? 'Est. Fin' : 'Inicio Prog.'}</span>
                                            <span className="flex items-center gap-1 text-sm font-semibold text-text">{ruta.status === 'pendiente' ? `${ruta.day} ${ruta.startTime}` : ruta.endTime || '—'}</span>
                                        </div>
                                    </div>

                                    {ruta.status === 'en_reparto' && (
                                        <div className="mb-4">
                                            <div className="h-2 w-full overflow-hidden rounded-[4px] bg-[#f1f5f9]">
                                                <div className="h-full rounded-[4px] bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2.5">
                                        {noDriver && ruta.status === 'pendiente' && (
                                            <button className={BTN_CARD_WARN} onClick={() => openEdit(ruta)}>
                                                <FiUsers /> Asignar Conductor
                                            </button>
                                        )}
                                        {ruta.status === 'pendiente' && !noDriver && (
                                            <button className={BTN_CARD_PRIMARY} onClick={() => handleStatusChange(ruta, 'en_reparto')}>
                                                <FiNavigation /> Iniciar Ruta
                                            </button>
                                        )}
                                        {ruta.status === 'en_reparto' && (
                                            <>
                                                <button className={BTN_CARD} onClick={() => openEdit(ruta)}>Ver Detalles</button>
                                                <button className={BTN_CARD_PRIMARY} onClick={() => handleStatusChange(ruta, 'completada')}>
                                                    <FiCheck /> Completar
                                                </button>
                                            </>
                                        )}
                                        {ruta.status === 'cargando' && (
                                            <button className={BTN_CARD} onClick={() => openEdit(ruta)}>Ver Orden</button>
                                        )}
                                        {(ruta.status === 'completada' || ruta.status === 'cancelada') && (
                                            <button className={BTN_CARD} onClick={() => openEdit(ruta)}>Ver Detalles</button>
                                        )}
                                        <button className={BTN_CARD_DEL} onClick={() => handleDelete(ruta.id)}><FiTrash2 /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* RIGHT: Map panel */}
                <div className="sticky top-5 overflow-hidden rounded-2xl border border-border bg-white max-[1024px]:static">
                    <div className="flex items-center justify-between border-b border-border px-5 py-[18px]">
                        <h3 className="flex items-center gap-2 font-display text-[15px] text-text"><FiMap /> Mapa en vivo</h3>
                        <FiMaximize2 className="cursor-pointer text-muted" />
                    </div>
                    <div className="relative h-[380px]">
                        <div className="flex h-full flex-col items-center justify-center bg-[#f8fafc] text-muted">
                            <FiMap className="mb-2.5 text-[40px] opacity-30" />
                            <p className="text-[13px]">Vista del mapa de rutas</p>
                            <p className="mt-1 text-[11px]">Se activará con rutas en reparto</p>
                        </div>
                    </div>
                    {activeRoute && (
                        <>
                            <div className="flex items-center justify-between border-t border-border px-5 py-4">
                                <div>
                                    <h4 className="text-sm text-text">{activeRoute.name} - {activeRoute.zone}</h4>
                                    <p className="mt-0.5 text-xs text-muted">{activeRoute.driver ? `Conductor: ${activeRoute.driver}` : 'Sin conductor asignado'}</p>
                                </div>
                                <span className="rounded-lg bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">
                                    {STATUS_MAP[activeRoute.status] || 'N/A'}
                                </span>
                            </div>
                            {activeRoute.totalStops > 0 && (
                                <div className="px-5 pb-4">
                                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-[#e2e8f0]">
                                        <div className="h-full rounded-[3px] bg-[#3b82f6]" style={{ width: `${Math.round((activeRoute.completedStops / activeRoute.totalStops) * 100)}%` }} />
                                    </div>
                                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                                        <span>Inicio</span>
                                        <span>Destino</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── MODAL (clases mod-* compartidas) ── */}
            {showModal && (
                <div className={MODAL_OVERLAY} onClick={() => setShowModal(false)}>
                    <div className={MODAL} onClick={ev => ev.stopPropagation()}>
                        <div className={MODAL_HEADER}>
                            <h2>{editingItem ? 'Editar Ruta' : 'Nueva Ruta'}</h2>
                            <button className={MODAL_CLOSE} onClick={closeModal}><FiX /></button>
                        </div>
                        <div className={MODAL_BODY}>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}>
                                    <label>Nombre de Ruta</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Ruta Norte" />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Zona</label>
                                    <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Ej: Zona A" />
                                </div>
                            </div>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}>
                                    <label>Conductor</label>
                                    <select value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })}>
                                        <option value="">Sin asignar</option>
                                        {empleados.filter(emp => emp.status === 'active').map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Vehículo</label>
                                    <input value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} placeholder="Ej: Van-04" />
                                </div>
                            </div>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}>
                                    <label>Día</label>
                                    <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
                                        {DAYS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Estado</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}>
                                    <label>Hora Inicio</label>
                                    <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Hora Est. Fin</label>
                                    <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div className={FORM_ROW}>
                                <div className={FORM_GROUP}>
                                    <label>Total Paradas</label>
                                    <input type="number" min="0" value={form.totalStops} onChange={e => setForm({ ...form, totalStops: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Paradas Completadas</label>
                                    <input type="number" min="0" value={form.completedStops} onChange={e => setForm({ ...form, completedStops: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className={FORM_GROUP}>
                                <label>Botellones a Entregar</label>
                                <input type="number" min="0" value={form.botellones} onChange={e => setForm({ ...form, botellones: parseInt(e.target.value) || 0 })} placeholder="Cantidad de botellones" />
                            </div>
                            <div className={MODAL_FOOTER}>
                                <button className={BTN_MOD} onClick={closeModal}>Cancelar</button>
                                <button className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
