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
import '../assets/css/clientes.css';
import '../assets/css/modulos.css';

const mensajeError = (error, fallback) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
};

const emptyClientForm = () => ({
    name: '',
    cedula: '',
    email: '',
    phone: '',
    address: '',
    type: 'Residencial',
    saldo: '0',
    limiteCredito: '',
    diasCredito: '',
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
            <button type="button" className="btn-mod" onClick={() => setShowModal(false)}>
                Cancelar
            </button>
            <button type="button" className="btn-mod primary" onClick={handleSave}>
                <FiCheck /> Guardar
            </button>
        </>
    );

    return (
        <div className="clientes-container">
            {isLoading && (
                <div className="loading-overlay">
                    <FiRefreshCw className="loading-spinner spin" />
                    <p className="loading-text">Cargando clientes...</p>
                </div>
            )}

            <div className="clientes-header">
                <div className="title-section">
                    <h1>Gestión de Clientes</h1>
                    <p>Administra tu cartera de clientes y abonos a crédito</p>
                </div>
                {segment === 'listado' && (
                    <button type="button" className="btn-add-client" onClick={openAdd}>
                        <FiPlus /> Agregar Cliente
                    </button>
                )}
            </div>

            <div className="clientes-segments" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={segment === 'listado'}
                    className={`clientes-segment-btn ${segment === 'listado' ? 'active' : ''}`}
                    onClick={() => setSegment('listado')}
                >
                    <FiUsers /> Listado
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={segment === 'abonos'}
                    className={`clientes-segment-btn ${segment === 'abonos' ? 'active' : ''}`}
                    onClick={() => setSegment('abonos')}
                >
                    <FiDollarSign /> Abonos a crédito
                </button>
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
            <div className="clientes-controls">
                <div className="search-box">
                    <FiSearch />
                    <input
                        className="search-input"
                        placeholder="Buscar por nombre, teléfono o email..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="all">Todos los tipos</option>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                </select>
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="all">Todos los estados</option>
                    <option value="active">Al día (sin deuda)</option>
                    <option value="delinquent">Moroso</option>
                    <option value="overlimit">Sobregirado</option>
                    <option value="con_credito">Con crédito habilitado</option>
                </select>
                <select
                    className="filter-select"
                    value={rowsPerPage}
                    onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setCurrentPage(1);
                    }}
                >
                    <option value={5}>5 por página</option>
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                </select>
            </div>

            <div className="clientes-stats">
                <div className="stat-box">
                    <p className="stat-label">Total Clientes</p>
                    <p className="stat-value">{stats.total}</p>
                </div>
                <div className="stat-box">
                    <p className="stat-label">Al día</p>
                    <p className="stat-value" style={{ color: '#22c55e' }}>
                        {stats.active}
                    </p>
                </div>
                <div className="stat-box">
                    <p className="stat-label">Morosos</p>
                    <p className="stat-value" style={{ color: '#ef4444' }}>
                        {stats.morosos}
                    </p>
                </div>
                <div className="stat-box">
                    <p className="stat-label">Con crédito</p>
                    <p className="stat-value" style={{ color: '#3b82f6' }}>
                        {stats.conCredito}
                    </p>
                </div>
                <div className="stat-box">
                    <p className="stat-label">Residenciales</p>
                    <p className="stat-value">{stats.res}</p>
                </div>
                <div className="stat-box">
                    <p className="stat-label">Comerciales</p>
                    <p className="stat-value">{stats.com}</p>
                </div>
            </div>

            <div className="clients-table-wrap">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Cédula</th>
                            <th>Dirección</th>
                            <th>Tipo</th>
                            <th>Saldo ($)</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedClients.map((client) => (
                            <tr key={client.id}>
                                <td>
                                    <div className="client-info-cell">
                                        <div className="client-avatar">
                                            {(client.name || '?').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="client-name-email">
                                            <p style={{ fontWeight: 600 }}>{client.name}</p>
                                            <p className="client-email">{client.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>{client.cedula}</td>
                                <td style={{ maxWidth: '200px' }}>
                                    <span className="td-muted">{client.address || 'Sin dirección'}</span>
                                </td>
                                <td>
                                    <span
                                        className={`badge ${client.type === 'Residencial' ? 'badge-res' : 'badge-com'}`}
                                    >
                                        {client.type}
                                    </span>
                                </td>
                                <td
                                    style={{
                                        fontWeight: 700,
                                        color: Number(client.saldo) > 0 ? '#ef4444' : '#22c55e',
                                    }}
                                >
                                    ${Number(client.saldo ?? 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`badge status-${client.status}`}>
                                        <span className="status-spot" />
                                        {statusLabel(client.status)}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {Number(client.saldo) > 0 && (
                                            <button
                                                type="button"
                                                className="btn-table-action abono"
                                                title="Registrar abono"
                                                onClick={() => openAbono(client)}
                                            >
                                                <FiDollarSign />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn-table-action"
                                            title="Editar"
                                            onClick={() => openEdit(client)}
                                        >
                                            <FiEdit2 />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-table-action delete"
                                            onClick={() => handleDelete(client)}
                                            title="Eliminar"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredClients.length === 0 && (
                    <div className="empty-table-state" style={{ padding: '60px' }}>
                        <FiUsers style={{ fontSize: '48px', opacity: 0.2 }} />
                        <p>No se encontraron clientes</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        type="button"
                        className="btn-pagination"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                    >
                        <FiChevronLeft /> Anterior
                    </button>
                    <div className="page-indicator">
                        Página <strong>{currentPage}</strong> de {totalPages}
                    </div>
                    <button
                        type="button"
                        className="btn-pagination"
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
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Nombre / razón social</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Nombre del cliente"
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Cédula / RIF</label>
                        <input
                            value={form.cedula}
                            onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                            placeholder="V-12345678"
                        />
                    </div>
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Correo</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Teléfono</label>
                        <input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="0412-1234567"
                        />
                    </div>
                </div>
                <div className="mod-form-group">
                    <label>Dirección</label>
                    <input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="Dirección completa"
                    />
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Tipo de cliente</label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                        </select>
                    </div>
                    {editingClient && (
                        <div className="mod-form-group">
                            <label>Saldo pendiente ($)</label>
                            <input
                                type="text"
                                readOnly
                                value={Number(editingClient.saldo ?? 0).toFixed(2)}
                                style={{ background: '#f8fafc', color: '#64748b' }}
                            />
                            <p className="mod-form-hint">Se actualiza con ventas a crédito y abonos.</p>
                        </div>
                    )}
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Límite de crédito</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.limiteCredito}
                            onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })}
                            placeholder="Requerido para ventas a crédito"
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Días de crédito</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.diasCredito}
                            onChange={(e) => setForm({ ...form, diasCredito: e.target.value })}
                            placeholder="Ej: 30"
                        />
                    </div>
                </div>
            </ModFormModal>
        </div>
    );
}
