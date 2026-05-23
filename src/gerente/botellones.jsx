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
import { FORM_GROUP, FORM_ROW, FORM_HINT, FORM_CHECK, BTN_MOD, BTN_MOD_PRIMARY } from '../ui/mod';

const TABS = [
    { id: 'botellones', label: 'Productos', icon: TbBottle, tipo: botellonService.TIPO_BOTELLON },
    { id: 'servicios', label: 'Servicios', icon: FiLayers, tipo: botellonService.TIPO_SERVICIO },
    { id: 'insumos', label: 'Insumos', icon: FiTool, tipo: botellonService.TIPO_INSUMO },
];

const STAT_ICON = {
    blue: 'bg-[#e0f2fe] text-[#0077cc]',
    green: 'bg-[#dcfce7] text-[#16a34a]',
    orange: 'bg-[#ffedd5] text-[#ea580c]',
};
const TH = 'border-b border-border bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.03em] text-muted';
const TD = 'border-b border-border px-4 py-3 align-middle text-text';
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-[10px] border-none bg-accent px-[18px] py-2.5 font-semibold text-white shadow-[0_4px_12px_rgba(0,119,204,0.25)] transition hover:-translate-y-px hover:bg-[#0066b3]';
const BTN_STOCK = 'flex items-center justify-center gap-1 rounded-[10px] border-none px-1.5 py-2.5 text-xs font-semibold transition hover:brightness-95';

const emptyItemForm = (tabId = 'botellones') => ({
    tipoInventario: tabId === 'insumos' ? 'insumo' : tabId === 'servicios' ? 'servicio' : 'botellon',
    nombre: '', sku: '', unidadMedida: 'UN', stockMinimo: 0, precioSugerido: 0,
    proveedorId: '', cuentaContableVentaId: '', gravaIva: true,
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
            Swal.fire('Sin stock físico', 'Los servicios no registran entradas ni salidas. Véndelos desde Ventas.', 'info');
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
            (i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
        );
    }, [inventory, search]);

    const stats = useMemo(() => {
        const refs = filteredInventory.length;
        const conStock = filteredInventory.filter((i) => i.controlaStock !== false);
        const unidades = conStock.reduce((a, i) => a + Number(i.stock || 0), 0);
        const alertas = conStock.filter((i) => i.stockBajo || Number(i.stock) <= Number(i.minStock)).length;
        const servicios = filteredInventory.filter((i) => i.type === botellonService.TIPO_SERVICIO).length;
        return { refs, unidades, alertas, servicios, esTabServicios: activeTab === 'servicios' };
    }, [filteredInventory, activeTab]);

    const historyForTab = useMemo(() => {
        const skus = new Set(filteredInventory.map((i) => i.sku));
        const names = new Set(filteredInventory.map((i) => i.name));
        return history.filter(
            (h) => h.itemSku === '' || h.itemNombre === '—' || skus.has(h.itemSku) || names.has(h.itemNombre)
        );
    }, [history, filteredInventory]);

    const totalPages = Math.max(1, Math.ceil(historyForTab.length / rowsPerPage));
    const paginatedHistory = historyForTab.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const tabMeta = TABS.find((t) => t.id === activeTab);

    return (
        <div className="relative animate-fade-up p-2.5">
            {isLoading && (
                <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-2 bg-white/60">
                    <FiRefreshCw className="animate-spin text-3xl text-accent" />
                    <p className="text-sm text-muted">Cargando inventario…</p>
                </div>
            )}

            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <FiDroplet className="mt-1 text-[32px] text-accent" />
                    <div>
                        <h1 className="font-display text-[28px] text-text">Inventario</h1>
                        <p className="mt-1 text-sm text-muted">
                            Productos, servicios e insumos · {user?.sucursal || 'Sucursal'} · ID {sucursalId}
                        </p>
                    </div>
                </div>
                <button type="button" className={BTN_PRIMARY} onClick={() => abrirFormularioItem()}>
                    <FiPlus /> Agregar artículo
                </button>
            </header>

            <nav className="mb-6 flex flex-wrap gap-2" role="tablist">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    const activeCls = tab.id === 'servicios'
                        ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                        : 'border-accent bg-accent text-white';
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-[18px] py-2.5 text-sm font-semibold transition ${
                                active ? activeCls : 'border-border bg-surface text-muted hover:border-accent hover:text-accent'
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon /> {tab.label}
                        </button>
                    );
                })}
            </nav>

            <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-[768px]:grid-cols-1">
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[22px] ${STAT_ICON.blue}`}>
                        {tabMeta?.icon ? <tabMeta.icon /> : <FiPackage />}
                    </div>
                    <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.04em] text-muted">Referencias</h3>
                        <p className="font-display text-[26px] text-text">{stats.refs}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[22px] ${STAT_ICON.green}`}>
                        <FiPackage />
                    </div>
                    <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.04em] text-muted">{stats.esTabServicios ? 'Servicios activos' : 'Unidades en stock'}</h3>
                        <p className="font-display text-[26px] text-text">{stats.esTabServicios ? stats.servicios : stats.unidades}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] text-[22px] ${stats.alertas > 0 ? STAT_ICON.orange : STAT_ICON.blue}`}>
                        {stats.alertas > 0 ? <FiAlertTriangle /> : <FiLayers />}
                    </div>
                    <div>
                        <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.04em] text-muted">{stats.esTabServicios ? 'Tipo' : 'Alertas stock bajo'}</h3>
                        <p className="font-display text-[26px] text-text">{stats.esTabServicios ? 'Sin inventario físico' : stats.alertas}</p>
                    </div>
                </div>
            </div>

            <div className="mb-5 flex gap-2.5">
                <input
                    type="search"
                    className="min-w-[200px] flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
                    placeholder="Buscar por nombre o SKU…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" className="flex items-center rounded-[10px] border border-border bg-surface px-3 py-2.5 text-muted transition hover:border-accent hover:text-accent" onClick={loadData} title="Actualizar">
                    <FiRefreshCw />
                </button>
            </div>

            <section className="mb-9 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px] max-[768px]:grid-cols-1">
                {filteredInventory.map((item) => {
                    const esServicio = item.controlaStock === false;
                    const bajo = !esServicio && (item.stockBajo || Number(item.stock) <= Number(item.minStock));
                    const cardExtra = esServicio
                        ? 'border-[#c4b5fd] bg-gradient-to-b from-surface to-[#f5f3ff]'
                        : bajo
                          ? 'border-[#fdba74] bg-gradient-to-b from-surface to-[#fff7ed]'
                          : 'border-border';
                    return (
                        <article
                            className={`rounded-2xl border bg-surface p-5 transition hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] ${cardExtra}`}
                            key={item.id}
                        >
                            <div className="mb-3 flex items-start justify-between gap-2">
                                <div>
                                    <h2 className="font-display text-lg leading-tight text-text">{item.name}</h2>
                                    <p className="mt-1 text-xs text-muted">
                                        {item.sku || 'Sin SKU'} · {item.unit}
                                        {!esServicio && ` · Mín. ${item.minStock}`}
                                    </p>
                                </div>
                                <span className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold ${esServicio ? 'bg-[#ede9fe] text-[#6d28d9]' : bajo ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                                    {esServicio ? 'Servicio' : bajo ? 'Stock bajo' : 'OK'}
                                </span>
                            </div>

                            <div className="py-4 pb-2 text-center">
                                {esServicio ? (
                                    <>
                                        <span className="block font-display text-[36px] leading-none text-[#94a3b8]">—</span>
                                        <span className="text-xs font-semibold uppercase text-muted">Sin stock físico</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="block font-display text-[42px] leading-none text-text">{Number(item.stock)}</span>
                                        <span className="text-xs font-semibold uppercase text-muted">unidades</span>
                                    </>
                                )}
                            </div>

                            {item.price > 0 && (
                                <p className="mb-3 text-center text-[13px] text-muted">Ref. ${Number(item.price).toFixed(2)}</p>
                            )}

                            <div className={`mt-2 grid gap-2 max-[768px]:grid-cols-1 ${esServicio ? 'grid-cols-1' : 'grid-cols-3'}`}>
                                <button type="button" className={`${BTN_STOCK} bg-[#f1f5f9] text-[#475569]`} onClick={() => abrirFormularioItem(item)}>
                                    <FiEdit2 /> Editar
                                </button>
                                {!esServicio && (
                                    <>
                                        <button type="button" className={`${BTN_STOCK} bg-[#dcfce7] text-[#166534]`} onClick={() => abrirMovimiento(item, 'in')}>
                                            <FiPlus /> Entrada
                                        </button>
                                        <button type="button" className={`${BTN_STOCK} bg-[#fee2e2] text-[#991b1b]`} onClick={() => abrirMovimiento(item, 'out')}>
                                            <FiMinus /> Salida
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}

                {filteredInventory.length === 0 && !isLoading && (
                    <div className="col-span-full px-6 py-12 text-center text-muted">
                        <div className="mb-3 flex justify-center text-[40px] opacity-25">
                            {activeTab === 'servicios' ? <FiLayers /> : activeTab === 'insumos' ? <FiTool /> : <TbBottle />}
                        </div>
                        <p className="mb-3">No hay artículos en esta categoría.</p>
                        <button type="button" className={`${BTN_PRIMARY} mx-auto`} onClick={() => abrirFormularioItem()}>
                            <FiPlus /> Agregar el primero
                        </button>
                    </div>
                )}
            </section>

            <section className="mt-2">
                <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl text-text">
                    <FiClock /> Movimientos recientes
                </h2>

                <div className="overflow-hidden rounded-2xl border border-border bg-surface max-[768px]:overflow-x-auto">
                    <table className="w-full border-collapse text-sm max-[768px]:min-w-[640px]">
                        <thead>
                            <tr>
                                <th className={TH}>Fecha</th>
                                <th className={TH}>Artículo</th>
                                <th className={TH}>Tipo</th>
                                <th className={TH}>Cant.</th>
                                <th className={TH}>Usuario</th>
                                <th className={TH}>Referencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map((move) => (
                                <tr key={move.id} className="transition last:[&>td]:border-b-0 hover:bg-[#f8fafc]">
                                    <td className={`${TD} text-[13px] text-muted`}>
                                        {new Date(String(move.fecha).replace(' ', 'T')).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className={TD}>
                                        <span className="block font-semibold text-text">{move.itemNombre}</span>
                                        {move.itemSku && <span className="block text-xs text-muted">{move.itemSku}</span>}
                                    </td>
                                    <td className={TD}>
                                        <span className={`inline-flex items-center gap-1.5 rounded-[20px] px-2.5 py-1 text-xs font-semibold ${move.esEntrada ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                                            {move.esEntrada ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                                            {move.tipoLabel}
                                        </span>
                                    </td>
                                    <td className={`${TD} font-bold [font-variant-numeric:tabular-nums]`}>
                                        {move.cantidad != null ? `${move.esEntrada ? '+' : '−'}${move.cantidad}` : '—'}
                                    </td>
                                    <td className={TD}>{move.usuarioNombre || '—'}</td>
                                    <td className={`${TD} max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted`}>{move.referenciaDoc || move.motivo || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {historyForTab.length === 0 && (
                        <div className="px-6 py-8 text-center text-muted">
                            <div className="mb-3 flex justify-center text-[40px] opacity-25"><FiClock /></div>
                            <p>Sin movimientos registrados para esta vista.</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-4">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            <FiChevronLeft /> Anterior
                        </button>
                        <span className="text-sm text-muted">
                            Página <strong>{currentPage}</strong> de {totalPages}
                        </span>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-accent enabled:hover:text-accent"
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
                        <button type="button" className={BTN_MOD} onClick={() => setShowItemModal(false)}>Cancelar</button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={guardarItem}><FiCheck /> Guardar</button>
                    </>
                }
            >
                <div className={FORM_GROUP}>
                    <label>Tipo</label>
                    <select value={itemForm.tipoInventario} onChange={(e) => setItemForm({ ...itemForm, tipoInventario: e.target.value })}>
                        <option value="botellon">Producto / botellón</option>
                        <option value="servicio">Servicio (recarga, etc.)</option>
                        <option value="insumo">Insumo (tapas, sellos…)</option>
                    </select>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Nombre</label>
                        <input value={itemForm.nombre} onChange={(e) => setItemForm({ ...itemForm, nombre: e.target.value })} placeholder="Ej: Botellón 20L" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>SKU</label>
                        <input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="PRO-BOT-20L" />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Unidad</label>
                        <input value={itemForm.unidadMedida} onChange={(e) => setItemForm({ ...itemForm, unidadMedida: e.target.value })} placeholder="UN" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Stock mínimo</label>
                        <input type="number" min="0" step="1" value={itemForm.stockMinimo} onChange={(e) => setItemForm({ ...itemForm, stockMinimo: Number(e.target.value) || 0 })} />
                    </div>
                </div>
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Precio referencia (USD)</label>
                        <input type="number" min="0" step="0.01" value={itemForm.precioSugerido} onChange={(e) => setItemForm({ ...itemForm, precioSugerido: Number(e.target.value) || 0 })} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label>Proveedor</label>
                        <select value={itemForm.proveedorId} onChange={(e) => setItemForm({ ...itemForm, proveedorId: e.target.value })}>
                            <option value="">Seleccionar…</option>
                            {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={FORM_GROUP}>
                    <label>Cuenta contable de venta (ingreso)</label>
                    {cuentaContableInvalida && (
                        <div className="mb-2.5 rounded-lg border border-[#f59e0b] bg-[#fef3c7] px-3 py-2.5 text-[13px] leading-snug text-[#92400e]" role="alert">
                            El ID <strong>{itemForm.cuentaContableVentaId}</strong> no corresponde a una cuenta de ingreso vigente. Seleccione una opción del listado para poder guardar.
                        </div>
                    )}
                    {cuentasIngreso.length === 0 ? (
                        <p className={FORM_HINT}>
                            No hay cuentas de ingreso en el plan contable.{' '}
                            <Link to="/gerente/contabilidad" className="font-semibold text-accent">Crear cuentas en Contabilidad</Link>
                            {' '}y vuelva a abrir este formulario.
                        </p>
                    ) : (
                        <select
                            value={itemForm.cuentaContableVentaId === '' || itemForm.cuentaContableVentaId == null ? '' : String(itemForm.cuentaContableVentaId)}
                            onChange={(e) => setItemForm({ ...itemForm, cuentaContableVentaId: e.target.value ? Number(e.target.value) : '' })}
                            className={cuentaContableInvalida ? '!border-[#f59e0b] !bg-[#fffbeb]' : ''}
                        >
                            <option value="">{cuentaContableInvalida ? 'Corrija: elija una cuenta válida…' : 'Seleccionar cuenta de ingreso…'}</option>
                            {cuentaContableInvalida && (
                                <option value={itemForm.cuentaContableVentaId} disabled>⚠ Actual: ID {itemForm.cuentaContableVentaId} (inválida)</option>
                            )}
                            {cuentasIngreso.map((c) => (
                                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                            ))}
                        </select>
                    )}
                    {cuentaSeleccionada && !cuentaContableInvalida && (
                        <p className={FORM_HINT}>ID {cuentaSeleccionada.id} · {cuentaSeleccionada.tipo}</p>
                    )}
                    <p className={FORM_HINT}>Solo cuentas tipo <strong>Ingreso</strong> (ej. ventas de productos 4.1.02).</p>
                </div>
                <label className={FORM_CHECK}>
                    <input type="checkbox" checked={itemForm.gravaIva} onChange={(e) => setItemForm({ ...itemForm, gravaIva: e.target.checked })} />
                    Grava IVA
                </label>
            </ModFormModal>

            <ModFormModal
                open={showMovModal}
                onClose={() => setShowMovModal(false)}
                title={movType === 'in' ? 'Entrada de stock' : 'Salida de stock'}
                footer={
                    <>
                        <button type="button" className={BTN_MOD} onClick={() => setShowMovModal(false)}>Cancelar</button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={confirmarMovimiento}><FiCheck /> Registrar</button>
                    </>
                }
            >
                {movItem && (
                    <p className="mb-4 text-sm text-muted">
                        <strong>{movItem.name}</strong> · Stock actual: {movItem.stock}
                    </p>
                )}
                <div className={FORM_GROUP}>
                    <label>Cantidad</label>
                    <input type="number" min="1" step="1" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} placeholder="Ej: 10" />
                </div>
                <div className={FORM_GROUP}>
                    <label>Motivo (opcional)</label>
                    <input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder={movType === 'in' ? 'Compra a proveedor' : 'Merma, rotura…'} />
                </div>
            </ModFormModal>
        </div>
    );
}
