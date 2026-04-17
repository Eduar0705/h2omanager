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
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as clientService from './services/clientes.service';
import '../assets/css/clientes.css';
import '../assets/css/configuracion.css'; // Reuse some global styles

const mensajeError = (error, fallback) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
};

const htmlFormularioCliente = `
    <div class="swal-form swal-form-cliente">
        <input id="swal-name" class="swal2-input" placeholder="Nombre / razón social">
        <input id="swal-cedula" class="swal2-input" placeholder="Cédula / RIF">
        <input id="swal-email" type="email" class="swal2-input" placeholder="Correo (solo referencia local)">
        <input id="swal-phone" class="swal2-input" placeholder="Teléfono">
        <input id="swal-address" class="swal2-input" placeholder="Dirección">
        <select id="swal-type" class="swal2-input">
            <option value="Residencial">Residencial</option>
            <option value="Comercial">Comercial</option>
        </select>
        <input id="swal-saldo" type="number" step="0.01" min="0" class="swal2-input" placeholder="Saldo">
        <input id="swal-limite" type="number" step="0.01" min="0" class="swal2-input" placeholder="Límite de crédito">
        <input id="swal-dias" type="number" step="1" min="0" class="swal2-input" placeholder="Días de crédito">
    </div>
`;

const leerFormularioCliente = () => {
    const name = document.getElementById('swal-name')?.value?.trim() ?? '';
    const cedula = document.getElementById('swal-cedula')?.value?.trim() ?? '';
    const email = document.getElementById('swal-email')?.value?.trim() ?? '';
    const phone = document.getElementById('swal-phone')?.value?.trim() ?? '';
    const address = document.getElementById('swal-address')?.value?.trim() ?? '';
    const type = document.getElementById('swal-type')?.value ?? 'Residencial';
    const saldoRaw = document.getElementById('swal-saldo')?.value;
    const limiteRaw = document.getElementById('swal-limite')?.value;
    const diasRaw = document.getElementById('swal-dias')?.value;

    if (!name || !cedula) {
        Swal.showValidationMessage('Nombre y cédula / RIF son obligatorios');
        return false;
    }

    const saldo = saldoRaw === '' || saldoRaw == null ? 0 : Number(saldoRaw);
    if (Number.isNaN(saldo) || saldo < 0) {
        Swal.showValidationMessage('Saldo inválido');
        return false;
    }

    let limiteCredito = null;
    if (limiteRaw !== '' && limiteRaw != null) {
        limiteCredito = Number(limiteRaw);
        if (Number.isNaN(limiteCredito) || limiteCredito < 0) {
            Swal.showValidationMessage('Límite de crédito inválido');
            return false;
        }
    }

    let diasCredito = null;
    if (diasRaw !== '' && diasRaw != null) {
        diasCredito = parseInt(diasRaw, 10);
        if (Number.isNaN(diasCredito) || diasCredito < 0) {
            Swal.showValidationMessage('Días de crédito inválidos');
            return false;
        }
    }

    return { name, cedula, email, phone, address, type, saldo, limiteCredito, diasCredito };
};

const rellenarFormularioCliente = (c) => {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };
    set('swal-name', c.name);
    set('swal-cedula', c.cedula);
    set('swal-email', c.email);
    set('swal-phone', c.phone);
    set('swal-address', c.address);
    const typeEl = document.getElementById('swal-type');
    if (typeEl) typeEl.value = c.type === 'Comercial' ? 'Comercial' : 'Residencial';
    set('swal-saldo', c.saldo != null ? String(c.saldo) : '0');
    set('swal-limite', c.limiteCredito != null ? String(c.limiteCredito) : '');
    set('swal-dias', c.diasCredito != null ? String(c.diasCredito) : '');
};

export default function Clientes() {
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setIsLoading(true);
        try {
            const data = await clientService.getClients();
            setClients(data);
            
        } catch (error) {
            Swal.fire('Error', mensajeError(error, 'No se pudieron cargar los clientes'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredClients = clients.filter(c => {
        const nombre = (c.name || '').toLowerCase();
        const correo = (c.email || '').toLowerCase();
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            nombre.includes(q) ||
            correo.includes(q) ||
            (c.cedula && String(c.cedula).includes(searchTerm));
        
        const matchesType = typeFilter === 'all' || c.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Stats
    const stats = {
        total: clients.length,
        active: clients.filter(c => c.status === 'active').length,
        res: clients.filter(c => c.type === 'Residencial').length,
        com: clients.filter(c => c.type === 'Comercial').length
    };

    const handleAddClient = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Agregar nuevo cliente',
            html: htmlFormularioCliente,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                document.getElementById('swal-saldo').value = '0';
            },
            preConfirm: () => leerFormularioCliente(),
        });

        if (formValues) {
            setIsLoading(true);
            try {
                await clientService.addClient(formValues);
                await loadClients();
                Swal.fire('¡Éxito!', 'Cliente agregado correctamente', 'success');
            } catch (error) {
                Swal.fire('Error', mensajeError(error, 'No se pudo agregar el cliente'), 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleEditClient = async (client) => {
        const { value: formValues } = await Swal.fire({
            title: 'Editar cliente',
            html: htmlFormularioCliente,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            didOpen: () => rellenarFormularioCliente(client),
            preConfirm: () => leerFormularioCliente(),
        });

        if (formValues) {
            setIsLoading(true);
            try {
                const payload = {
                    name: formValues.name,
                    cedula: formValues.cedula,
                    phone: formValues.phone,
                    address: formValues.address,
                    type: formValues.type,
                    saldo: formValues.saldo,
                };
                if (formValues.limiteCredito != null) {
                    payload.limiteCredito = formValues.limiteCredito;
                }
                if (formValues.diasCredito != null) {
                    payload.diasCredito = formValues.diasCredito;
                }
                await clientService.updateClient(client.id, payload);
                await loadClients();
                Swal.fire('Listo', 'Cliente actualizado correctamente', 'success');
            } catch (error) {
                Swal.fire('Error', mensajeError(error, 'No se pudo actualizar el cliente'), 'error');
            } finally {
                setIsLoading(false);
            }
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
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            setIsLoading(true);
            try {
                await clientService.deleteClient(client.id);
                await loadClients();
                Swal.fire('Eliminado', 'El cliente ha sido borrado', 'success');
            } catch (error) {
                Swal.fire('Error', mensajeError(error, 'No se pudo eliminar el cliente'), 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

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
                    <p>Administra tu cartera de clientes</p>
                </div>
                <button className="btn-add-client" onClick={handleAddClient}>
                    <FiPlus /> Agregar Cliente
                </button>
            </div>

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
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="delinquent">Moroso</option>
                </select>
                <select 
                    className="filter-select" 
                    value={rowsPerPage}
                    onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
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
                    <p className="stat-label">Activos</p>
                    <p className="stat-value" style={{ color: '#22c55e' }}>{stats.active}</p>
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
                        {paginatedClients.map(client => (
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
                                    <span className={`badge ${client.type === 'Residencial' ? 'badge-res' : 'badge-com'}`}>
                                        {client.type}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 700, color: Number(client.saldo) > 0 ? '#ef4444' : '#22c55e' }}>
                                    ${Number(client.saldo ?? 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`badge status-${client.status}`}>
                                        <span className="status-spot" />
                                        {client.status === 'active' ? 'Activo' : client.status === 'delinquent' ? 'Moroso' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            type="button"
                                            className="btn-table-action"
                                            title="Editar"
                                            onClick={() => handleEditClient(client)}
                                        >
                                            <FiEdit2 />
                                        </button>
                                        <button 
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
                        className="btn-pagination" 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        <FiChevronLeft /> Anterior
                    </button>
                    <div className="page-indicator">
                        Página <strong>{currentPage}</strong> de {totalPages}
                    </div>
                    <button 
                        className="btn-pagination" 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Siguiente <FiChevronRight />
                    </button>
                </div>
            )}
        </div>
    );
}
