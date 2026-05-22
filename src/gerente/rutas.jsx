import { useState, useEffect, useMemo } from 'react';
import {
    FiMap, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiX,
    FiCheck, FiMapPin, FiTruck, FiClock, FiUsers,
    FiDownload, FiNavigation, FiAlertTriangle,
    FiMaximize2, FiUser
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as rutaService from './services/rutas.service';
import * as empleadoService from './services/empleados.service';
import '../assets/css/rutas.css';

const STATUS_MAP = {
    en_reparto: 'En Reparto',
    pendiente: 'Pendiente',
    cargando: 'Cargando',
    completada: 'Completada',
    cancelada: 'Cancelada',
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Rutas() {
    const [rutas, setRutas] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState('all'); // all, en_reparto, completada
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
        } catch (e) { Swal.fire('Error', 'No se pudieron cargar las rutas', 'error'); }
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

    // ─── Filters ────────────────
    const filtered = useMemo(() => {
        let items = [...rutas];
        if (tab === 'en_reparto') items = items.filter(r => r.status === 'en_reparto' || r.status === 'cargando');
        else if (tab === 'completada') items = items.filter(r => r.status === 'completada');
        if (sortBy === 'time') items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        else if (sortBy === 'name') items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return items;
    }, [rutas, tab, sortBy]);

    // ─── Stats ──────────────────
    const activeCount = rutas.filter(r => r.status === 'en_reparto' || r.status === 'cargando').length;
    const completedCount = rutas.filter(r => r.status === 'completada').length;
    const pendingCount = rutas.filter(r => r.status === 'pendiente').length;
    const driversSet = new Set(rutas.map(r => r.driver).filter(Boolean));

    // Active route for map
    const activeRoute = rutas.find(r => r.status === 'en_reparto') || rutas[0];

    return (
        <div className="rutas-container">
            {/* HEADER */}
            <div className="rutas-header">
                <div className="title-section">
                    <h1>Rutas de Reparto</h1>
                    <p>Gestiona y optimiza las rutas de entrega diarias</p>
                </div>
                <div className="rut-header-actions">
                    <button className="btn-rut" onClick={loadData}><FiRefreshCw className={isLoading ? 'spin' : ''} /></button>
                    <button className="btn-rut" onClick={() => {}}><FiDownload /> Exportar</button>
                    <button className="btn-rut primary" onClick={() => { closeModal(); setShowModal(true); }}>
                        <FiNavigation /> Nueva Ruta
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div className="rut-stats">
                <div className="rut-stat-card">
                    <div className="rut-stat-icon blue"><FiTruck /></div>
                    <div className="rut-stat-info">
                        <p className="rut-stat-label">Rutas Activas</p>
                        <p className="rut-stat-value">{activeCount}</p>
                    </div>
                </div>
                <div className="rut-stat-card">
                    <div className="rut-stat-icon green"><FiCheck /></div>
                    <div className="rut-stat-info">
                        <p className="rut-stat-label">Completadas</p>
                        <p className="rut-stat-value">{completedCount}</p>
                    </div>
                </div>
                <div className="rut-stat-card">
                    <div className="rut-stat-icon amber"><FiClock /></div>
                    <div className="rut-stat-info">
                        <p className="rut-stat-label">Pendientes</p>
                        <p className="rut-stat-value">{pendingCount}</p>
                    </div>
                </div>
                <div className="rut-stat-card">
                    <div className="rut-stat-icon purple"><FiUsers /></div>
                    <div className="rut-stat-info">
                        <p className="rut-stat-label">Conductores</p>
                        <p className="rut-stat-value">{driversSet.size}</p>
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT */}
            <div className="rut-main-layout">
                {/* LEFT: Routes list */}
                <div>
                    <div className="rut-filter-bar">
                        {[{ id: 'all', label: 'Todas' }, { id: 'en_reparto', label: 'En Progreso' }, { id: 'completada', label: 'Completadas' }].map(t => (
                            <button key={t.id} className={`rut-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                        <div className="rut-sort-label">
                            <FiClock size={14} /> Ordenar por:
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="time">Hora de inicio</option>
                                <option value="name">Nombre</option>
                            </select>
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="rut-empty"><FiMap /><h3>{isLoading ? 'Cargando...' : 'Sin rutas'}</h3><p>Crea una ruta para comenzar</p></div>
                    ) : (
                        filtered.map((ruta, i) => {
                            const progress = ruta.totalStops > 0 ? Math.round((ruta.completedStops / ruta.totalStops) * 100) : 0;
                            const noDriver = !ruta.driver;
                            return (
                                <div key={ruta.id} className="rut-card">
                                    <div className="rut-card-top">
                                        <div className="rut-card-id-block">
                                            <div className="rut-card-number">R{i + 1}</div>
                                            <div className="rut-card-title">
                                                <h3>{ruta.name} - {ruta.zone}</h3>
                                                <p className="rut-card-id">ID: #{ruta.routeId || ruta.id}</p>
                                            </div>
                                        </div>
                                        <span className={`rut-status ${ruta.status}`}>
                                            {STATUS_MAP[ruta.status] || ruta.status}
                                        </span>
                                    </div>

                                    <div className="rut-card-details">
                                        <div className="rut-detail-item">
                                            <span className="rut-detail-label">Conductor</span>
                                            <span className={`rut-detail-value ${noDriver ? 'warn' : ''}`}>
                                                {noDriver ? <><FiAlertTriangle size={13} /> Sin Asignar</> : <><FiUser size={13} /> {ruta.driver}</>}
                                            </span>
                                        </div>
                                        <div className="rut-detail-item">
                                            <span className="rut-detail-label">Vehículo</span>
                                            <span className="rut-detail-value"><FiTruck size={13} /> {ruta.vehicle || '—'}</span>
                                        </div>
                                        {ruta.status === 'en_reparto' ? (
                                            <div className="rut-detail-item">
                                                <span className="rut-detail-label">Progreso</span>
                                                <span className="rut-detail-value">{ruta.completedStops}/{ruta.totalStops} Entregas</span>
                                            </div>
                                        ) : (
                                            <div className="rut-detail-item">
                                                <span className="rut-detail-label">Botellones</span>
                                                <span className="rut-detail-value">{ruta.botellones || 0} Unidades</span>
                                            </div>
                                        )}
                                        <div className="rut-detail-item">
                                            <span className="rut-detail-label">{ruta.status === 'en_reparto' ? 'Est. Fin' : 'Inicio Prog.'}</span>
                                            <span className="rut-detail-value">{ruta.status === 'pendiente' ? `${ruta.day} ${ruta.startTime}` : ruta.endTime || '—'}</span>
                                        </div>
                                    </div>

                                    {ruta.status === 'en_reparto' && (
                                        <div className="rut-progress-wrap">
                                            <div className="rut-progress-bar">
                                                <div className="rut-progress-fill" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="rut-card-actions">
                                        {noDriver && ruta.status === 'pendiente' && (
                                            <button className="btn-card warn" onClick={() => openEdit(ruta)}>
                                                <FiUsers /> Asignar Conductor
                                            </button>
                                        )}
                                        {ruta.status === 'pendiente' && !noDriver && (
                                            <button className="btn-card primary" onClick={() => handleStatusChange(ruta, 'en_reparto')}>
                                                <FiNavigation /> Iniciar Ruta
                                            </button>
                                        )}
                                        {ruta.status === 'en_reparto' && (
                                            <>
                                                <button className="btn-card" onClick={() => openEdit(ruta)}>Ver Detalles</button>
                                                <button className="btn-card primary" onClick={() => handleStatusChange(ruta, 'completada')}>
                                                    <FiCheck /> Completar
                                                </button>
                                            </>
                                        )}
                                        {ruta.status === 'cargando' && (
                                            <button className="btn-card" onClick={() => openEdit(ruta)}>Ver Orden</button>
                                        )}
                                        {(ruta.status === 'completada' || ruta.status === 'cancelada') && (
                                            <button className="btn-card" onClick={() => openEdit(ruta)}>Ver Detalles</button>
                                        )}
                                        <button className="btn-card del" onClick={() => handleDelete(ruta.id)}><FiTrash2 /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* RIGHT: Map panel */}
                <div className="rut-map-panel">
                    <div className="rut-map-header">
                        <h3><FiMap /> Mapa en vivo</h3>
                        <FiMaximize2 style={{ color: 'var(--muted)', cursor: 'pointer' }} />
                    </div>
                    <div className="rut-map-body">
                        <div className="rut-map-placeholder">
                            <FiMap />
                            <p>Vista del mapa de rutas</p>
                            <p style={{ fontSize: '11px', marginTop: '4px' }}>Se activará con rutas en reparto</p>
                        </div>
                    </div>
                    {activeRoute && (
                        <>
                            <div className="rut-map-info">
                                <div className="rut-map-info-left">
                                    <h4>{activeRoute.name} - {activeRoute.zone}</h4>
                                    <p>{activeRoute.driver ? `Conductor: ${activeRoute.driver}` : 'Sin conductor asignado'}</p>
                                </div>
                                <span className="rut-map-status">
                                    {STATUS_MAP[activeRoute.status] || 'N/A'}
                                </span>
                            </div>
                            {activeRoute.totalStops > 0 && (
                                <div className="rut-map-progress">
                                    <div className="rut-map-prog-bar">
                                        <div className="rut-map-prog-fill" style={{ width: `${Math.round((activeRoute.completedStops / activeRoute.totalStops) * 100)}%` }} />
                                    </div>
                                    <div className="rut-map-prog-labels">
                                        <span>Inicio</span>
                                        <span>Destino</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── MODAL ──────────────────────────── */}
            {showModal && (
                <div className="mod-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="mod-modal" onClick={ev => ev.stopPropagation()}>
                        <div className="mod-modal-header">
                            <h2>{editingItem ? 'Editar Ruta' : 'Nueva Ruta'}</h2>
                            <button className="btn-close" onClick={closeModal}><FiX /></button>
                        </div>
                        <div className="mod-modal-body">
                            <div className="mod-form-row">
                                <div className="mod-form-group">
                                    <label>Nombre de Ruta</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Ruta Norte" />
                                </div>
                                <div className="mod-form-group">
                                    <label>Zona</label>
                                    <input value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Ej: Zona A" />
                                </div>
                            </div>
                            <div className="mod-form-row">
                                <div className="mod-form-group">
                                    <label>Conductor</label>
                                    <select value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })}>
                                        <option value="">Sin asignar</option>
                                        {empleados.filter(emp => emp.status === 'active').map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mod-form-group">
                                    <label>Vehículo</label>
                                    <input value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} placeholder="Ej: Van-04" />
                                </div>
                            </div>
                            <div className="mod-form-row">
                                <div className="mod-form-group">
                                    <label>Día</label>
                                    <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>
                                        {DAYS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="mod-form-group">
                                    <label>Estado</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="mod-form-row">
                                <div className="mod-form-group">
                                    <label>Hora Inicio</label>
                                    <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                </div>
                                <div className="mod-form-group">
                                    <label>Hora Est. Fin</label>
                                    <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div className="mod-form-row">
                                <div className="mod-form-group">
                                    <label>Total Paradas</label>
                                    <input type="number" min="0" value={form.totalStops} onChange={e => setForm({ ...form, totalStops: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="mod-form-group">
                                    <label>Paradas Completadas</label>
                                    <input type="number" min="0" value={form.completedStops} onChange={e => setForm({ ...form, completedStops: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="mod-form-group">
                                <label>Botellones a Entregar</label>
                                <input type="number" min="0" value={form.botellones} onChange={e => setForm({ ...form, botellones: parseInt(e.target.value) || 0 })} placeholder="Cantidad de botellones" />
                            </div>
                            <div className="mod-modal-footer">
                                <button className="btn-mod" onClick={closeModal}>Cancelar</button>
                                <button className="btn-mod primary" onClick={handleSave}><FiCheck /> Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
