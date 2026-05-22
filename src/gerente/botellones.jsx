import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    FiEdit2,
    FiDroplet,
    FiTool,
    FiLayers,
    FiCheck,
} from 'react-icons/fi';
import { TbBottle } from 'react-icons/tb';
import Swal from 'sweetalert2';
import ModFormModal from '../components/ModFormModal';
import { useAuth } from '../auth/AuthContext';
import * as botellonService from './services/botellones.service';
import '../assets/css/botellones.css';
import '../assets/css/modulos.css';

const TABS = [
    { id: 'botellones', label: 'Productos', icon: TbBottle, tipo: botellonService.TIPO_BOTELLON },
    { id: 'servicios', label: 'Servicios', icon: FiLayers, tipo: botellonService.TIPO_SERVICIO },
    { id: 'insumos', label: 'Insumos', icon: FiTool, tipo: botellonService.TIPO_INSUMO },
];

const emptyItemForm = (tabId = 'botellones') => ({
    tipoInventario: tabId === 'insumos' ? 'insumo' : tabId === 'servicios' ? 'servicio' : 'botellon',
    nombre: '',
    sku: '',
    unidadMedida: 'UN',
    stockMinimo: 0,
    precioSugerido: 0,
    proveedorId: '',
    cuentaContableVentaId: '',
    gravaIva: true,
});

const itemToForm = (item) => ({
    tipoInventario:
        item.type === botellonService.TIPO_INSUMO
            ? 'insumo'
            : item.type === botellonService.TIPO_SERVICIO
              ? 'servicio'
              : 'botellon',
    nombre: item.nombre ?? item.name ?? '',
    sku: item.sku ?? '',
    unidadMedida: item.unidadMedida ?? item.unit ?? 'UN',
    stockMinimo: Number(item.stockMinimo ?? item.minStock ?? 0),
    precioSugerido: Number(item.precioSugerido ?? item.price ?? 0),
    proveedorId: Number(item.proveedorId ?? 0) || '',
    cuentaContableVentaId: Number(item.cuentaContableVentaId ?? 1),
    gravaIva: Boolean(item.gravaIva),
});

export default function Botellones() {
    const { user } = useAuth();
    const sucursalId = Number(user?.sucursalId ?? botellonService.DEFAULT_SUCURSAL_ID);
    const usuarioId = Number(user?.id ?? 1);

    const [activeTab, setActiveTab] = useState('botellones');
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [cuentasIngreso, setCuentasIngreso] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 12;

    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemForm, setItemForm] = useState(emptyItemForm());

    const [showMovModal, setShowMovModal] = useState(false);
    const [movItem, setMovItem] = useState(null);
    const [movType, setMovType] = useState('in');
    const [movCantidad, setMovCantidad] = useState('');
    const [movMotivo, setMovMotivo] = useState('');

    const activeTipo = TABS.find((t) => t.id === activeTab)?.tipo;

    useEffect(() => {
        loadData();
    }, [activeTab, sucursalId]);

    const cargarCuentasIngreso = useCallback(async () => {
        try {
            const lista = await botellonService.getCuentasIngresoOpciones();
            setCuentasIngreso(lista);
            return lista;
        } catch {
            setCuentasIngreso([]);
            return [];
        }
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [invData, histData, proveedorData, cuentasData] = await Promise.all([
                botellonService.getInventory(sucursalId, activeTipo),
                botellonService.getHistory(sucursalId),
                botellonService.getProveedoresOpciones().catch(() => []),
                botellonService.getCuentasIngresoOpciones().catch(() => []),
            ]);
            setInventory(invData);
            setHistory(histData);
            setProveedores(proveedorData);
            setCuentasIngreso(cuentasData);
            setCurrentPage(1);
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo cargar el inventario', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const abrirFormularioItem = async (item = null) => {
        setEditingItem(item);
        let cuentas = cuentasIngreso;
        if (!cuentas.length) {
            cuentas = await cargarCuentasIngreso();
        }

        const baseForm = item ? itemToForm(item) : emptyItemForm(activeTab);
        if (!item) {
            const defecto = botellonService.cuentaIngresoPorDefecto(cuentas);
            if (defecto) baseForm.cuentaContableVentaId = defecto.id;
        }

        setItemForm(baseForm);
        setShowItemModal(true);
    };

    const cuentaSeleccionada = cuentasIngreso.find(
        (c) => Number(c.id) === Number(itemForm.cuentaContableVentaId)
    );
    const cuentaContableInvalida =
        itemForm.cuentaContableVentaId &&
        !botellonService.esCuentaIngresoValida(itemForm.cuentaContableVentaId, cuentasIngreso);

    const guardarItem = async () => {
        const form = itemForm;
        if (!form.nombre?.trim()) {
            Swal.fire('Validación', 'El nombre es obligatorio', 'warning');
            return;
        }
        if (!form.sku?.trim()) {
            Swal.fire('Validación', 'El SKU es obligatorio', 'warning');
            return;
        }
        if (!form.proveedorId || Number(form.proveedorId) <= 0) {
            Swal.fire('Validación', 'Selecciona un proveedor', 'warning');
            return;
        }
        if (!botellonService.esCuentaIngresoValida(form.cuentaContableVentaId, cuentasIngreso)) {
            Swal.fire(
                'Cuenta contable',
                cuentaContableInvalida
                    ? 'La cuenta asignada al artículo ya no es válida. Elija una cuenta de ingreso del listado.'
                    : 'Seleccione una cuenta de ingreso para las ventas de este artículo.',
                'warning'
            );
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...form,
                stockMinimo: Number(form.stockMinimo),
                precioSugerido: Number(form.precioSugerido),
                proveedorId: Number(form.proveedorId),
                cuentaContableVentaId: Number(form.cuentaContableVentaId),
            };
            if (editingItem?.id) await botellonService.updateItem(editingItem.id, payload);
            else await botellonService.createItem(payload);
            setShowItemModal(false);
            await loadData();
            Swal.fire({ icon: 'success', title: 'Artículo guardado', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo guardar.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const abrirMovimiento = (item, type) => {
        if (item.controlaStock === false) {
            Swal.fire(
                'Sin stock físico',
                'Los servicios no registran entradas ni salidas. Véndelos desde Ventas.',
                'info'
            );
            return;
        }
        setMovItem(item);
        setMovType(type);
        setMovCantidad('');
        setMovMotivo('');
        setShowMovModal(true);
    };

    const confirmarMovimiento = async () => {
        const qty = parseInt(movCantidad, 10);
        if (!qty || qty <= 0) {
            Swal.fire('Validación', 'Cantidad inválida', 'warning');
            return;
        }
        if (movType === 'out' && qty > Number(movItem?.stock || 0)) {
            Swal.fire('Validación', 'Stock insuficiente', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const result = await botellonService.updateStock(movItem.id, qty, movType, movMotivo.trim(), {
                sucursalId,
                usuarioId,
            });
            setShowMovModal(false);
            await loadData();
            Swal.fire({
                icon: 'success',
                title: 'Stock actualizado',
                text: `Nuevo stock: ${result.stockNuevo ?? '—'}`,
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredInventory = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return inventory;
        return inventory.filter(
            (i) =>
                i.name?.toLowerCase().includes(q) ||
                i.sku?.toLowerCase().includes(q)
        );
    }, [inventory, search]);

    const stats = useMemo(() => {
        const refs = filteredInventory.length;
        const conStock = filteredInventory.filter((i) => i.controlaStock !== false);
        const unidades = conStock.reduce((a, i) => a + Number(i.stock || 0), 0);
        const alertas = conStock.filter(
            (i) => i.stockBajo || Number(i.stock) <= Number(i.minStock)
        ).length;
        const servicios = filteredInventory.filter((i) => i.type === botellonService.TIPO_SERVICIO).length;
        return { refs, unidades, alertas, servicios, esTabServicios: activeTab === 'servicios' };
    }, [filteredInventory, activeTab]);

    const historyForTab = useMemo(() => {
        const skus = new Set(filteredInventory.map((i) => i.sku));
        const names = new Set(filteredInventory.map((i) => i.name));
        return history.filter(
            (h) =>
                h.itemSku === '' ||
                h.itemNombre === '—' ||
                skus.has(h.itemSku) ||
                names.has(h.itemNombre)
        );
    }, [history, filteredInventory]);

    const totalPages = Math.max(1, Math.ceil(historyForTab.length / rowsPerPage));
    const paginatedHistory = historyForTab.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const tabMeta = TABS.find((t) => t.id === activeTab);

    return (
        <div className="botellones-container">
            {isLoading && (
                <div className="loading-overlay">
                    <FiRefreshCw className="loading-spinner spin" />
                    <p className="loading-text">Cargando inventario…</p>
                </div>
            )}

            <header className="inv-page-header">
                <div className="inv-page-title">
                    <FiDroplet className="inv-title-icon" />
                    <div>
                        <h1>Inventario</h1>
                        <p>
                            Productos, servicios e insumos · {user?.sucursal || 'Sucursal'} · ID {sucursalId}
                        </p>
                    </div>
                </div>
                <button type="button" className="btn-inv-primary" onClick={() => abrirFormularioItem()}>
                    <FiPlus /> Agregar artículo
                </button>
            </header>

            <nav className="inv-tabs" role="tablist">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`inv-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon /> {tab.label}
                        </button>
                    );
                })}
            </nav>

            <div className="inventory-stats">
                <div className="inv-stat-card">
                    <div className="inv-stat-icon icon-blue">
                        {tabMeta?.icon ? <tabMeta.icon /> : <FiPackage />}
                    </div>
                    <div className="inv-stat-info">
                        <h3>Referencias</h3>
                        <p>{stats.refs}</p>
                    </div>
                </div>
                <div className="inv-stat-card">
                    <div className="inv-stat-icon icon-green">
                        <FiPackage />
                    </div>
                    <div className="inv-stat-info">
                        <h3>{stats.esTabServicios ? 'Servicios activos' : 'Unidades en stock'}</h3>
                        <p>{stats.esTabServicios ? stats.servicios : stats.unidades}</p>
                    </div>
                </div>
                <div className="inv-stat-card">
                    <div className={`inv-stat-icon ${stats.alertas > 0 ? 'icon-orange' : 'icon-blue'}`}>
                        {stats.alertas > 0 ? <FiAlertTriangle /> : <FiLayers />}
                    </div>
                    <div className="inv-stat-info">
                        <h3>{stats.esTabServicios ? 'Tipo' : 'Alertas stock bajo'}</h3>
                        <p>{stats.esTabServicios ? 'Sin inventario físico' : stats.alertas}</p>
                    </div>
                </div>
            </div>

            <div className="inv-toolbar">
                <input
                    type="search"
                    className="inv-search"
                    placeholder="Buscar por nombre o SKU…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" className="btn-inv-ghost" onClick={loadData} title="Actualizar">
                    <FiRefreshCw />
                </button>
            </div>

            <section className="inventory-grid">
                {filteredInventory.map((item) => {
                    const esServicio = item.controlaStock === false;
                    const bajo =
                        !esServicio &&
                        (item.stockBajo || Number(item.stock) <= Number(item.minStock));
                    return (
                        <article
                            className={`inventory-item-card ${esServicio ? 'card-servicio' : ''} ${bajo ? 'card-alert' : ''}`}
                            key={item.id}
                        >
                            <div className="item-header">
                                <div className="item-title">
                                    <h2>{item.name}</h2>
                                    <p className="item-meta">
                                        {item.sku || 'Sin SKU'} · {item.unit}
                                        {!esServicio && ` · Mín. ${item.minStock}`}
                                    </p>
                                </div>
                                <span
                                    className={`item-badge ${esServicio ? 'badge-servicio' : bajo ? 'badge-out' : 'badge-in'}`}
                                >
                                    {esServicio ? 'Servicio' : bajo ? 'Stock bajo' : 'OK'}
                                </span>
                            </div>

                            <div className="item-stock-display">
                                {esServicio ? (
                                    <>
                                        <span className="stock-value stock-na">—</span>
                                        <span className="stock-label">Sin stock físico</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="stock-value">{Number(item.stock)}</span>
                                        <span className="stock-label">unidades</span>
                                    </>
                                )}
                            </div>

                            {item.price > 0 && (
                                <p className="item-price-ref">Ref. ${Number(item.price).toFixed(2)}</p>
                            )}

                            <div className={`item-actions ${esServicio ? 'actions-servicio' : ''}`}>
                                <button
                                    type="button"
                                    className="btn-stock edit"
                                    onClick={() => abrirFormularioItem(item)}
                                >
                                    <FiEdit2 /> Editar
                                </button>
                                {!esServicio && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn-stock in"
                                            onClick={() => abrirMovimiento(item, 'in')}
                                        >
                                            <FiPlus /> Entrada
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-stock out"
                                            onClick={() => abrirMovimiento(item, 'out')}
                                        >
                                            <FiMinus /> Salida
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}

                {filteredInventory.length === 0 && !isLoading && (
                    <div className="inv-empty-state">
                        {activeTab === 'servicios' ? <FiLayers /> : activeTab === 'insumos' ? <FiTool /> : <TbBottle />}
                        <p>No hay artículos en esta categoría.</p>
                        <button type="button" className="btn-inv-primary" onClick={() => abrirFormularioItem()}>
                            <FiPlus /> Agregar el primero
                        </button>
                    </div>
                )}
            </section>

            <section className="inv-history-section">
                <h2 className="history-section-title">
                    <FiClock /> Movimientos recientes
                </h2>

                <div className="inv-table-wrap">
                    <table className="inv-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Artículo</th>
                                <th>Tipo</th>
                                <th>Cant.</th>
                                <th>Usuario</th>
                                <th>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map((move) => (
                                <tr key={move.id}>
                                    <td className="td-muted">
                                        {new Date(String(move.fecha).replace(' ', 'T')).toLocaleString('es-VE', {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                        })}
                                    </td>
                                    <td>
                                        <span className="inv-item-name">{move.itemNombre}</span>
                                        {move.itemSku && (
                                            <span className="inv-item-sku">{move.itemSku}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`inv-mov-pill ${move.esEntrada ? 'pill-in' : 'pill-out'}`}
                                        >
                                            {move.esEntrada ? (
                                                <FiArrowDownLeft />
                                            ) : (
                                                <FiArrowUpRight />
                                            )}
                                            {move.tipoLabel}
                                        </span>
                                    </td>
                                    <td className="inv-qty">
                                        {move.cantidad != null
                                            ? `${move.esEntrada ? '+' : '−'}${move.cantidad}`
                                            : '—'}
                                    </td>
                                    <td>{move.usuarioNombre || '—'}</td>
                                    <td className="td-muted inv-ref">{move.referenciaDoc || move.motivo || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {historyForTab.length === 0 && (
                        <div className="inv-empty-state compact">
                            <FiClock />
                            <p>Sin movimientos registrados para esta vista.</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="btn-pagination"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            <FiChevronLeft /> Anterior
                        </button>
                        <span className="page-indicator">
                            Página <strong>{currentPage}</strong> de {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn-pagination"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            Siguiente <FiChevronRight />
                        </button>
                    </div>
                )}
            </section>

            <ModFormModal
                open={showItemModal}
                onClose={() => setShowItemModal(false)}
                title={editingItem ? 'Editar artículo' : 'Nuevo artículo'}
                wide
                footer={
                    <>
                        <button type="button" className="btn-mod" onClick={() => setShowItemModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn-mod primary" onClick={guardarItem}>
                            <FiCheck /> Guardar
                        </button>
                    </>
                }
            >
                <div className="mod-form-group">
                    <label>Tipo</label>
                    <select
                        value={itemForm.tipoInventario}
                        onChange={(e) => setItemForm({ ...itemForm, tipoInventario: e.target.value })}
                    >
                        <option value="botellon">Producto / botellón</option>
                        <option value="servicio">Servicio (recarga, etc.)</option>
                        <option value="insumo">Insumo (tapas, sellos…)</option>
                    </select>
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Nombre</label>
                        <input
                            value={itemForm.nombre}
                            onChange={(e) => setItemForm({ ...itemForm, nombre: e.target.value })}
                            placeholder="Ej: Botellón 20L"
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>SKU</label>
                        <input
                            value={itemForm.sku}
                            onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                            placeholder="PRO-BOT-20L"
                        />
                    </div>
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Unidad</label>
                        <input
                            value={itemForm.unidadMedida}
                            onChange={(e) => setItemForm({ ...itemForm, unidadMedida: e.target.value })}
                            placeholder="UN"
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Stock mínimo</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={itemForm.stockMinimo}
                            onChange={(e) =>
                                setItemForm({ ...itemForm, stockMinimo: Number(e.target.value) || 0 })
                            }
                        />
                    </div>
                </div>
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Precio referencia (USD)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={itemForm.precioSugerido}
                            onChange={(e) =>
                                setItemForm({ ...itemForm, precioSugerido: Number(e.target.value) || 0 })
                            }
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Proveedor</label>
                        <select
                            value={itemForm.proveedorId}
                            onChange={(e) => setItemForm({ ...itemForm, proveedorId: e.target.value })}
                        >
                            <option value="">Seleccionar…</option>
                            {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mod-form-group mod-form-cuenta-venta">
                    <label>Cuenta contable de venta (ingreso)</label>
                    {cuentaContableInvalida && (
                        <div className="cuenta-venta-alerta" role="alert">
                            El ID <strong>{itemForm.cuentaContableVentaId}</strong> no corresponde a una
                            cuenta de ingreso vigente. Seleccione una opción del listado para poder guardar.
                        </div>
                    )}
                    {cuentasIngreso.length === 0 ? (
                        <p className="mod-form-hint cuenta-venta-sin-opciones">
                            No hay cuentas de ingreso en el plan contable.{' '}
                            <Link to="/gerente/contabilidad">Crear cuentas en Contabilidad</Link>
                            {' '}y vuelva a abrir este formulario.
                        </p>
                    ) : (
                        <select
                            value={
                                itemForm.cuentaContableVentaId === '' ||
                                itemForm.cuentaContableVentaId == null
                                    ? ''
                                    : String(itemForm.cuentaContableVentaId)
                            }
                            onChange={(e) =>
                                setItemForm({
                                    ...itemForm,
                                    cuentaContableVentaId: e.target.value
                                        ? Number(e.target.value)
                                        : '',
                                })
                            }
                            className={cuentaContableInvalida ? 'input-cuenta-invalida' : ''}
                        >
                            <option value="">
                                {cuentaContableInvalida
                                    ? 'Corrija: elija una cuenta válida…'
                                    : 'Seleccionar cuenta de ingreso…'}
                            </option>
                            {cuentaContableInvalida && (
                                <option value={itemForm.cuentaContableVentaId} disabled>
                                    ⚠ Actual: ID {itemForm.cuentaContableVentaId} (inválida)
                                </option>
                            )}
                            {cuentasIngreso.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.codigo} — {c.nombre}
                                </option>
                            ))}
                        </select>
                    )}
                    {cuentaSeleccionada && !cuentaContableInvalida && (
                        <p className="mod-form-hint">
                            ID {cuentaSeleccionada.id} · {cuentaSeleccionada.tipo}
                        </p>
                    )}
                    <p className="mod-form-hint">
                        Solo cuentas tipo <strong>Ingreso</strong> (ej. ventas de productos 4.1.02).
                    </p>
                </div>
                <label className="mod-form-check" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                        type="checkbox"
                        checked={itemForm.gravaIva}
                        onChange={(e) => setItemForm({ ...itemForm, gravaIva: e.target.checked })}
                    />
                    Grava IVA
                </label>
            </ModFormModal>

            <ModFormModal
                open={showMovModal}
                onClose={() => setShowMovModal(false)}
                title={movType === 'in' ? 'Entrada de stock' : 'Salida de stock'}
                footer={
                    <>
                        <button type="button" className="btn-mod" onClick={() => setShowMovModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn-mod primary" onClick={confirmarMovimiento}>
                            <FiCheck /> Registrar
                        </button>
                    </>
                }
            >
                {movItem && (
                    <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0 0 16px' }}>
                        <strong>{movItem.name}</strong> · Stock actual: {movItem.stock}
                    </p>
                )}
                <div className="mod-form-group">
                    <label>Cantidad</label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={movCantidad}
                        onChange={(e) => setMovCantidad(e.target.value)}
                        placeholder="Ej: 10"
                    />
                </div>
                <div className="mod-form-group">
                    <label>Motivo (opcional)</label>
                    <input
                        value={movMotivo}
                        onChange={(e) => setMovMotivo(e.target.value)}
                        placeholder={movType === 'in' ? 'Compra a proveedor' : 'Merma, rotura…'}
                    />
                </div>
            </ModFormModal>
        </div>
    );
}
