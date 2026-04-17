import { useState, useEffect } from 'react';
import { 
    FiPackage, 
    FiPlus, 
    FiMinus, 
    FiClock, 
    FiChevronLeft, 
    FiChevronRight,
    FiAlertTriangle,
    FiRefreshCw,
    FiArrowDownLeft,
    FiArrowUpRight,
    FiEdit2
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import * as botellonService from './services/botellones.service';
import '../assets/css/botellones.css';
import '../assets/css/configuracion.css';

export default function Botellones() {
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Pagination for history
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [invData, histData, proveedorData] = await Promise.all([
                botellonService.getInventory(),
                botellonService.getHistory(),
                botellonService.getProveedoresOpciones().catch(() => [])
            ]);
            setInventory(invData);
            setHistory(histData);
            setProveedores(proveedorData);
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo cargar el inventario', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const escHtml = (value) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const normalizarItemParaFormulario = (item = {}) => ({
        nombre: item.nombre ?? item.name ?? '',
        sku: item.sku ?? '',
        unidadMedida: item.unidadMedida ?? item.unit ?? 'UN',
        stockMinimo: Number(item.stockMinimo ?? item.minStock ?? 0),
        precioSugerido: Number(item.precioSugerido ?? 0),
        proveedorId: Number(item.proveedorId ?? 0),
        cuentaContableVentaId: Number(item.cuentaContableVentaId ?? 1),
        gravaIva: Boolean(item.gravaIva),
    });

    const htmlFormularioItem = (item = {}) => {
        const formItem = normalizarItemParaFormulario(item);
        const proveedoresOptions = proveedores.length > 0
            ? proveedores
                .map((p) => `<option value="${p.id}" ${Number(formItem.proveedorId) === Number(p.id) ? 'selected' : ''}>${escHtml(p.label)}</option>`)
                .join('')
            : '<option value="">Sin proveedores disponibles</option>';

        return `
            <div style="display:grid;gap:10px;text-align:left;">
                <label>Nombre</label>
                <input id="itm-nombre" class="swal2-input" placeholder="Ej: Botellón 20L" value="${escHtml(formItem.nombre)}">
                <label>SKU</label>
                <input id="itm-sku" class="swal2-input" placeholder="Ej: BOT-20L" value="${escHtml(formItem.sku)}">
                <label>Unidad de medida</label>
                <input id="itm-unidad" class="swal2-input" placeholder="UN" value="${escHtml(formItem.unidadMedida)}">
                <label>Stock mínimo</label>
                <input id="itm-stock-min" class="swal2-input" type="number" min="0" step="1" value="${formItem.stockMinimo}">
                <label>Precio sugerido</label>
                <input id="itm-precio" class="swal2-input" type="number" min="0" step="0.01" value="${formItem.precioSugerido}">
                <label>Proveedor</label>
                <select id="itm-proveedor" class="swal2-select">${proveedoresOptions}</select>
                <label>Cuenta contable venta (ID)</label>
                <input id="itm-cuenta" class="swal2-input" type="number" min="1" step="1" value="${formItem.cuentaContableVentaId}">
                <label style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input id="itm-iva" type="checkbox" ${formItem.gravaIva ? 'checked' : ''}>
                    Grava IVA
                </label>
            </div>
        `;
    };

    const leerFormularioItem = () => ({
        nombre: document.getElementById('itm-nombre')?.value?.trim() || '',
        sku: document.getElementById('itm-sku')?.value?.trim() || '',
        unidadMedida: document.getElementById('itm-unidad')?.value?.trim() || 'UN',
        stockMinimo: Number(document.getElementById('itm-stock-min')?.value || 0),
        precioSugerido: Number(document.getElementById('itm-precio')?.value || 0),
        proveedorId: Number(document.getElementById('itm-proveedor')?.value || 0),
        cuentaContableVentaId: Number(document.getElementById('itm-cuenta')?.value || 0),
        gravaIva: Boolean(document.getElementById('itm-iva')?.checked),
    });

    const abrirFormularioItem = async (item = null) => {
        const titulo = item ? 'Editar producto/insumo' : 'Agregar producto/insumo';
        const { isConfirmed, value } = await Swal.fire({
            title: titulo,
            html: htmlFormularioItem(item || {}),
            width: 680,
            showCancelButton: true,
            confirmButtonText: item ? 'Guardar cambios' : 'Crear',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            preConfirm: () => {
                const form = leerFormularioItem();
                if (!form.nombre) return Swal.showValidationMessage('El nombre es obligatorio');
                if (!form.sku) return Swal.showValidationMessage('El SKU es obligatorio');
                if (!form.unidadMedida) return Swal.showValidationMessage('La unidad de medida es obligatoria');
                if (!Number.isFinite(form.proveedorId) || form.proveedorId <= 0) {
                    return Swal.showValidationMessage('Selecciona un proveedor válido');
                }
                if (!Number.isFinite(form.cuentaContableVentaId) || form.cuentaContableVentaId <= 0) {
                    return Swal.showValidationMessage('La cuenta contable de venta es obligatoria');
                }
                if (!Number.isFinite(form.stockMinimo) || form.stockMinimo < 0) {
                    return Swal.showValidationMessage('Stock mínimo inválido');
                }
                if (!Number.isFinite(form.precioSugerido) || form.precioSugerido < 0) {
                    return Swal.showValidationMessage('Precio sugerido inválido');
                }
                return form;
            }
        });

        if (!isConfirmed) return;

        setIsLoading(true);
        try {
            if (item?.id) {
                await botellonService.updateItem(item.id, value);
            } else {
                await botellonService.createItem(value);
            }
            await loadData();
            Swal.fire('Listo', item ? 'Producto/insumo actualizado.' : 'Producto/insumo creado.', 'success');
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo guardar el item.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMovement = async (item, type) => {
        const { value: amount } = await Swal.fire({
            title: type === 'in' ? 'Registrar Entrada' : 'Registrar Salida',
            text: `${item.name} (${item.sku || 'sin SKU'})`,
            input: 'number',
            inputAttributes: { min: '1', step: '1' },
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: type === 'in' ? '#22c55e' : '#ef4444',
            inputValidator: (value) => {
                if (!value || parseInt(value) <= 0) {
                    return 'Debes ingresar una cantidad válida';
                }
                if (type === 'out' && parseInt(value) > Number(item.stock || 0)) {
                    return 'No hay suficiente stock disponible';
                }
            }
        });

        if (amount) {
            const { value: note } = await Swal.fire({
                title: 'Nota / Motivo (Opcional)',
                input: 'text',
                placeholder: 'Ej: Reposición de inventario...',
                showCancelButton: true,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Omitir',
                confirmButtonColor: 'var(--accent)',
            });

            setIsLoading(true);
            try {
                await botellonService.updateStock(item.id, parseInt(amount), type, note || '');
                await loadData();
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: `Stock de ${item.name} actualizado con éxito.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Stats
    const totalBottles = inventory.reduce((acc, curr) => acc + Number(curr.stock || 0), 0);
    const lowStockItems = inventory.filter(i => Number(i.stock || 0) <= Number(i.minStock || 0)).length;

    // Pagination
    const totalPages = Math.ceil(history.length / rowsPerPage);
    const paginatedHistory = history.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    return (
        <div className="botellones-container">
            {isLoading && (
                <div className="loading-overlay">
                    <FiRefreshCw className="loading-spinner spin" />
                    <p className="loading-text">Cargando inventario...</p>
                </div>
            )}

            <div className="clientes-header">
                <div className="title-section">
                    <h1>Mantenimiento de Botellones</h1>
                    <p>Control de stock y movimiento de envases</p>
                </div>
                <div className="header-actions">
                    <button className="btn-primary icon-btn" onClick={() => abrirFormularioItem()}>
                        <FiPlus /> Agregar producto/insumo
                    </button>
                </div>
            </div>

            <div className="inventory-stats">
                <div className="inv-stat-card">
                    <div className="inv-stat-icon icon-blue"><FiPackage /></div>
                    <div className="inv-stat-info">
                        <h3>Total Envases</h3>
                        <p>{totalBottles}</p>
                    </div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-icon icon-green"><FiRefreshCw /></div>
                    <div className="inv-stat-info">
                        <h3>Disponibles</h3>
                        <p>{totalBottles}</p>
                    </div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-icon icon-orange">
                        {lowStockItems > 0 ? <FiAlertTriangle /> : <FiPackage />}
                    </div>
                    <div className="inv-stat-info">
                        <h3>Stock Bajo</h3>
                        <p>{lowStockItems}</p>
                    </div>
                </div>
            </div>

            <div className="inventory-grid">
                {inventory.map(item => (
                    <div className="inventory-item-card" key={item.id}>
                        <div className="item-header">
                            <div className="item-title">
                                <h2>{item.name}</h2>
                                <p className="td-muted">{item.sku || 'Sin SKU'} · {item.unit}</p>
                            </div>
                            <span className={`item-badge ${Number(item.stock || 0) <= Number(item.minStock || 0) ? 'badge-out' : 'badge-in'}`}>
                                {Number(item.stock || 0) <= Number(item.minStock || 0) ? 'STOCK BAJO' : 'STOCK OK'}
                            </span>
                        </div>
                        
                        <div className="item-stock-display">
                            <span className="stock-value">{Number(item.stock || 0)}</span>
                            <span className="stock-label">En Stock</span>
                        </div>

                        <div className="item-actions">
                            <button className="btn-stock" onClick={() => abrirFormularioItem(item)}>
                                <FiEdit2 /> Editar
                            </button>
                            <button className="btn-stock in" onClick={() => handleMovement(item, 'in')}>
                                <FiPlus /> Entrada
                            </button>
                            <button className="btn-stock out" onClick={() => handleMovement(item, 'out')}>
                                <FiMinus /> Salida
                            </button>
                        </div>
                    </div>
                ))}

                {inventory.length === 0 && !isLoading && (
                    <div className="empty-table-state" style={{ padding: '40px', gridColumn: '1 / -1' }}>
                        <FiPackage style={{ fontSize: '32px', opacity: 0.2 }} />
                        <p>No hay productos o insumos disponibles en inventario.</p>
                    </div>
                )}
            </div>

            <h2 className="history-section-title">
                <FiClock /> Historial de Movimientos
            </h2>

            <div className="clients-table-wrap">
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo Movimiento</th>
                            <th>Tipo</th>
                            <th>Sucursal</th>
                            <th>Usuario</th>
                            <th>Referencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedHistory.map(move => (
                            <tr key={move.id}>
                                <td className="td-muted">
                                    {new Date(String(move.fecha).replace(' ', 'T')).toLocaleString('es-VE')}
                                </td>
                                <td style={{ fontWeight: 600 }}>{move.tipo || '—'}</td>
                                <td>
                                    <div className={`history-badge ${(move.tipo === 'compra' || move.tipo === 'ajuste') ? 'badge-in' : 'badge-out'}`}>
                                        {(move.tipo === 'compra' || move.tipo === 'ajuste') ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                                    </div>
                                </td>
                                <td className="td-muted">{move.sucursalNombre || '—'}</td>
                                <td style={{ fontWeight: 600 }}>{move.usuarioNombre || '—'}</td>
                                <td className="td-muted" style={{ fontStyle: 'italic', fontSize: '13px' }}>
                                    {move.referenciaDoc || '---'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {history.length === 0 && (
                    <div className="empty-table-state" style={{ padding: '40px' }}>
                        <FiClock style={{ fontSize: '32px', opacity: 0.2 }} />
                        <p>No hay movimientos registrados</p>
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
