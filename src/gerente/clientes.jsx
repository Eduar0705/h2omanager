import { useState, useEffect } from 'react';
import {
    FiUsers,
    FiSearch,
    FiPlus,
    FiChevronLeft,
    FiChevronRight,
    FiEdit2,
    FiTrash2,
    FiRefreshCw,
    FiCheck,
    FiDollarSign,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import ModFormModal from '../components/ModFormModal';
import ClientesAbonosPanel from './components/ClientesAbonosPanel';
import * as clientService from './services/clientes.service';
import { FORM_GROUP, FORM_ROW, FORM_HINT, BTN_MOD, BTN_MOD_PRIMARY } from '../ui/mod';

const TABLE = 'w-full border-collapse text-sm';
const TH = 'border-b border-border bg-[#f8fafc] px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wide text-muted';
const TD = 'border-b border-[#f1f5f9] px-4 py-4 text-text';
const BADGE = 'inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold';
const BTN_ADD = 'flex items-center gap-2 rounded-[10px] border-none bg-accent px-5 py-2.5 font-semibold text-white shadow-[0_4px_12px_rgba(0,119,204,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0066b3] max-md:w-full max-md:justify-center';
const BTN_TABLE = 'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-accent hover:text-accent';
const SEARCH_INPUT = 'w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/[0.08]';
const FILTER_SELECT = 'min-w-[140px] cursor-pointer rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent max-[480px]:w-full';

const STATUS = {
    active: { cls: 'bg-[#dcfce7] text-[#166534]', dot: 'bg-[#22c55e]' },
    delinquent: { cls: 'bg-[#fee2e2] text-[#991b1b]', dot: 'bg-[#ef4444]' },
    overlimit: { cls: 'border border-[#fecaca] bg-[#fef2f2] text-[#991b1b]', dot: 'bg-[#dc2626]' },
    inactive: { cls: 'bg-[#f1f5f9] text-[#475569]', dot: 'bg-[#94a3b8]' },
};

const mensajeError = (error, fallback) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
};

const emptyClientForm = () => ({
    name: '', cedula: '', email: '', phone: '', address: '',
    type: 'Residencial', saldo: '0', limiteCredito: '', diasCredito: '',
});

const clientFromRecord = (c) => ({
    name: c.name || '',
    cedula: c.cedula || '',
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    type: c.type === 'Comercial' ? 'Comercial' : 'Residencial',
    saldo: c.saldo != null ? String(c.saldo) : '0',
    limiteCredito: c.limiteCredito != null ? String(c.limiteCredito) : '',
    diasCredito: c.diasCredito != null ? String(c.diasCredito) : '',
});

const statusLabel = (status) => {
    if (status === 'active') return 'Activo';
    if (status === 'delinquent') return 'Moroso';
    if (status === 'overlimit') return 'Sobregirado';
    return '—';
};

function parseClientForm(form) {
    if (!form.name?.trim() || !form.cedula?.trim()) {
        return { error: 'Nombre y cédula / RIF son obligatorios' };
    }
    let limiteCredito = null;
    if (form.limiteCredito !== '') {
        limiteCredito = Number(form.limiteCredito);
        if (Number.isNaN(limiteCredito) || limiteCredito < 0) return { error: 'Límite de crédito inválido' };
    }
    let diasCredito = null;
    if (form.diasCredito !== '') {
        diasCredito = parseInt(form.diasCredito, 10);
        if (Number.isNaN(diasCredito) || diasCredito < 0) return { error: 'Días de crédito inválidos' };
    }
    return {
        data: {
            name: form.name.trim(),
            cedula: form.cedula.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            type: form.type,
            limiteCredito,
            diasCredito,
        },
    };
}

export default function Clientes() {
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [segment, setSegment] = useState('listado');
    const [abonoClientId, setAbonoClientId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [form, setForm] = useState(emptyClientForm);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            setClients(await clientService.getClients());
        } catch (error) {
            Swal.fire('Error', mensajeError(error, 'No se pudieron cargar los clientes'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredClients = clients.filter((c) => {
        const nombre = (c.name || '').toLowerCase();
        const correo = (c.email || '').toLowerCase();
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            nombre.includes(q) || correo.includes(q) || (c.cedula && String(c.cedula).includes(searchTerm));
        const matchesType = typeFilter === 'all' || c.type === typeFilter;
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'con_credito' ? c.tieneCredito : c.status === statusFilter);
        return matchesSearch && matchesType && matchesStatus;
    });

    const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const stats = {
        total: clients.length,
        active: clients.filter((c) => c.status === 'active').length,
        morosos: clients.filter((c) => c.status === 'delinquent' || c.status === 'overlimit').length,
        conCredito: clients.filter((c) => c.tieneCredito).length,
        res: clients.filter((c) => c.type === 'Residencial').length,
        com: clients.filter((c) => c.type === 'Comercial').length,
    };

    const openAdd = () => {
        setEditingClient(null);
        setForm(emptyClientForm());
        setShowModal(true);
    };

    const openEdit = (client) => {
        setEditingClient(client);
        setForm(clientFromRecord(client));
        setShowModal(true);
    };

    const openAbono = (client) => {
        setAbonoClientId(client.id);
        setSegment('abonos');
    };

    const handleSave = async () => {
        const parsed = parseClientForm(form);
        if (parsed.error) {
            Swal.fire('Validación', parsed.error, 'warning');
            return;
        }
        setIsLoading(true);
        try {
            if (editingClient) {
                const payload = {
                    name: parsed.data.name,
                    cedula: parsed.data.cedula,
                    phone: parsed.data.phone,
                    address: parsed.data.address,
                    type: parsed.data.type,
                };
                if (parsed.data.limiteCredito != null) payload.limiteCredito = parsed.data.limiteCredito;
                if (parsed.data.diasCredito != null) payload.diasCredito = parsed.data.diasCredito;
                await clientService.updateClient(editingClient.id, payload);
            } else {
                await clientService.addClient(parsed.data);
            }
            setShowModal(false);
            await loadClients();
            Swal.fire({
                icon: 'success',
                title: editingClient ? 'Actualizado' : '¡Éxito!',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire('Error', mensajeError(error, 'No se pudo guardar'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (client) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar al cliente ${client.name}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            setIsLoading(true);
            try {
                await clientService.deleteClient(client.id);
                await loadClients();
                Swal.fire('Eliminado', 'El cliente ha sido borrado', 'success');
            } catch (error) {
                Swal.fire('Error', mensajeError(error, 'No se pudo eliminar'), 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const modalFooter = (
        <>
            <button type="button" className={BTN_MOD} onClick={() => setShowModal(false)}>Cancelar</button>
            <button type="button" className={BTN_MOD_PRIMARY} onClick={handleSave}><FiCheck /> Guardar</button>
        </>
    );

    return (
        <div className="relative animate-fade-up p-2.5">
            {isLoading && (
                <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-2 bg-white/60">
                    <FiRefreshCw className="animate-spin text-3xl text-accent" />
                    <p className="text-sm text-muted">Cargando clientes...</p>
                </div>
            )}

            <div className="mb-7 flex items-start justify-between max-md:flex-col max-md:gap-5">
                <div>
                    <h1 className="font-display text-[28px] text-text">Gestión de Clientes</h1>
                    <p className="mt-1 text-sm text-muted">Administra tu cartera de clientes y abonos a crédito</p>
                </div>
                {segment === 'listado' && (
                    <button type="button" className={BTN_ADD} onClick={openAdd}>
                        <FiPlus /> Agregar Cliente
                    </button>
                )}
            </div>

            <div className="mb-6 flex flex-wrap gap-2.5" role="tablist">
                {[
                    { id: 'listado', icon: FiUsers, label: 'Listado' },
                    { id: 'abonos', icon: FiDollarSign, label: 'Abonos a crédito' },
                ].map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={segment === s.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-[18px] py-2.5 text-sm font-semibold transition ${
                            segment === s.id
                                ? 'border-accent bg-accent/[0.08] text-accent'
                                : 'border-border bg-white text-[#64748b]'
                        }`}
                        onClick={() => setSegment(s.id)}
                    >
                        <s.icon /> {s.label}
                    </button>
                ))}
            </div>

            {segment === 'abonos' ? (
                <ClientesAbonosPanel
                    clients={clients}
                    initialClientId={abonoClientId}
                    onAbonoRegistrado={() => {
                        loadClients();
                        setAbonoClientId(null);
                    }}
                />
            ) : (
                <>
                    <div className="mb-6 flex flex-wrap gap-4">
                        <div className="relative min-w-[280px] flex-1">
                            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                className={SEARCH_INPUT}
                                placeholder="Buscar por nombre, teléfono o email..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <select className={FILTER_SELECT} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
                            <option value="all">Todos los tipos</option>
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                        </select>
                        <select className={FILTER_SELECT} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                            <option value="all">Todos los estados</option>
                            <option value="active">Al día (sin deuda)</option>
                            <option value="delinquent">Moroso</option>
                            <option value="overlimit">Sobregirado</option>
                            <option value="con_credito">Con crédito habilitado</option>
                        </select>
                        <select className={FILTER_SELECT} value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }}>
                            <option value={5}>5 por página</option>
                            <option value={10}>10 por página</option>
                            <option value={20}>20 por página</option>
                        </select>
                    </div>

                    <div className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 max-[1024px]:grid-cols-2 max-[480px]:grid-cols-1">
                        {[
                            { label: 'Total Clientes', value: stats.total, color: undefined },
                            { label: 'Al día', value: stats.active, color: '#22c55e' },
                            { label: 'Morosos', value: stats.morosos, color: '#ef4444' },
                            { label: 'Con crédito', value: stats.conCredito, color: '#3b82f6' },
                            { label: 'Residenciales', value: stats.res, color: undefined },
                            { label: 'Comerciales', value: stats.com, color: undefined },
                        ].map((s) => (
                            <div key={s.label} className="rounded-2xl border border-border bg-surface p-6 text-center transition hover:-translate-y-1">
                                <p className="mb-2 text-[13px] font-medium text-muted">{s.label}</p>
                                <p className="font-display text-[32px] text-text" style={s.color ? { color: s.color } : undefined}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface max-md:overflow-x-auto">
                        <table className={TABLE}>
                            <thead>
                                <tr>
                                    <th className={TH}>Cliente</th>
                                    <th className={TH}>Cédula</th>
                                    <th className={TH}>Dirección</th>
                                    <th className={TH}>Tipo</th>
                                    <th className={TH}>Saldo ($)</th>
                                    <th className={TH}>Estado</th>
                                    <th className={TH}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedClients.map((client) => {
                                    const st = STATUS[client.status] || STATUS.inactive;
                                    return (
                                        <tr key={client.id}>
                                            <td className={TD}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent text-sm font-bold text-white">
                                                        {(client.name || '?').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{client.name}</p>
                                                        <p className="text-xs text-muted">{client.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={TD}>{client.cedula}</td>
                                            <td className={`${TD} max-w-[200px]`}>
                                                <span className="text-muted">{client.address || 'Sin dirección'}</span>
                                            </td>
                                            <td className={TD}>
                                                <span className={`${BADGE} ${client.type === 'Residencial' ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#f3e8ff] text-[#7e22ce]'}`}>
                                                    {client.type}
                                                </span>
                                            </td>
                                            <td className={`${TD} font-bold`} style={{ color: Number(client.saldo) > 0 ? '#ef4444' : '#22c55e' }}>
                                                ${Number(client.saldo ?? 0).toFixed(2)}
                                            </td>
                                            <td className={TD}>
                                                <span className={`${BADGE} ${st.cls}`}>
                                                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${st.dot}`} />
                                                    {statusLabel(client.status)}
                                                </span>
                                            </td>
                                            <td className={TD}>
                                                <div className="flex gap-2">
                                                    {Number(client.saldo) > 0 && (
                                                        <button
                                                            type="button"
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] transition hover:bg-[#e0f2fe]"
                                                            title="Registrar abono"
                                                            onClick={() => openAbono(client)}
                                                        >
                                                            <FiDollarSign />
                                                        </button>
                                                    )}
                                                    <button type="button" className={BTN_TABLE} title="Editar" onClick={() => openEdit(client)}>
                                                        <FiEdit2 />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-[#ef4444] hover:text-[#ef4444]"
                                                        onClick={() => handleDelete(client)}
                                                        title="Eliminar"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredClients.length === 0 && (
                            <div className="flex flex-col items-center gap-3 p-[60px] text-center text-muted">
                                <FiUsers className="text-5xl opacity-20" />
                                <p>No se encontraron clientes</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((prev) => prev - 1)}
                            >
                                <FiChevronLeft /> Anterior
                            </button>
                            <div className="text-[13px] text-muted">
                                Página <strong>{currentPage}</strong> de {totalPages}
                            </div>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                            >
                                Siguiente <FiChevronRight />
                            </button>
                        </div>
                    )}
                </>
            )}

            <ModFormModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingClient ? 'Editar cliente' : 'Nuevo cliente'}
                wide
                footer={modalFooter}
            >
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Nombre / razón social</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del cliente" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Cédula / RIF</label>
                        <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="V-12345678" />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Correo</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Teléfono</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0412-1234567" />
                    </div>
                </div>
                <div className={FORM_GROUP}>
                    <label>Dirección</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección completa" />
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Tipo de cliente</label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                        </select>
                    </div>
                    {editingClient && (
                        <div className={FORM_GROUP}>
                            <label>Saldo pendiente ($)</label>
                            <input type="text" readOnly value={Number(editingClient.saldo ?? 0).toFixed(2)} className="!bg-[#f8fafc] !text-[#64748b]" />
                            <p className={FORM_HINT}>Se actualiza con ventas a crédito y abonos.</p>
                        </div>
                    )}
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Límite de crédito</label>
                        <input type="number" step="0.01" min="0" value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })} placeholder="Requerido para ventas a crédito" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Días de crédito</label>
                        <input type="number" min="0" step="1" value={form.diasCredito} onChange={(e) => setForm({ ...form, diasCredito: e.target.value })} placeholder="Ej: 30" />
                    </div>
                </div>
            </ModFormModal>
        </div>
    );
}
