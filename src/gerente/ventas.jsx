import { useState, useEffect, useMemo } from 'react';
import {
    FiMapPin,
    FiUser,
    FiSearch,
    FiShoppingCart,
    FiCheck,
    FiDollarSign,
    FiCreditCard,
    FiSmartphone,
    FiPlus,
    FiMinus,
    FiTrash2,
    FiPrinter
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { FiBox, FiTool, FiLayers } from 'react-icons/fi';
import { TbBottle } from 'react-icons/tb';
import { useAuth } from '../auth/AuthContext';
import { getClients, puedeVenderCredito } from './services/clientes.service';
import CreditoPagoPanel from './components/CreditoPagoPanel';
import * as catalogoService from './services/catalogo-ventas.service';
import * as ventaService from './services/ventas.service';
import * as configService from './services/config.service';
import { calcularTotalesCarrito } from './services/ventas-calculo';

const STEPS = [
    { id: 1, label: 'Venta Local', icon: FiMapPin },
    { id: 2, label: 'Cliente', icon: FiUser },
    { id: 3, label: 'Productos', icon: FiShoppingCart },
    { id: 4, label: 'Pago', icon: FiDollarSign },
    { id: 5, label: 'Confirmación', icon: FiCheck }
];

const BANCOS_VE = [
    'Banco de Venezuela', 'Banesco', 'Banco Mercantil', 'BBVA Provincial',
    'Banco Nacional de Crédito (BNC)', 'Banco del Tesoro', 'Banco Bicentenario',
    'Banco Exterior', 'Banco Caroní', 'Banco Sofitasa', 'Banco Plaza', 'Bancaribe',
    'Banco Activo', 'Bancamiga', 'Banco Fondo Común (BFC)', 'Mi Banco', '100% Banco',
    'Banco Agrícola de Venezuela',
];

// Shared input style
const refInputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', border: '1px solid #dde3ec',
    borderRadius: '8px', fontSize: '14px', fontWeight: 600,
    outline: 'none', background: '#fff',
};

// Bank/reference fields component — defined OUTSIDE to avoid remount on every render
function BankRefFields({ banco, ref6, onBancoChange, onRefChange }) {
    return (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Banco emisor *
                </label>
                <select
                    value={banco}
                    onChange={(e) => onBancoChange(e.target.value)}
                    style={{ ...refInputStyle, fontWeight: 500, color: banco ? '#1e293b' : '#94a3b8' }}
                >
                    <option value="">Seleccionar banco...</option>
                    {BANCOS_VE.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            <div style={{ width: '160px', flexShrink: 0 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Referencia (6 dígitos) *
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={ref6}
                    onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                        onRefChange(v);
                    }}
                    placeholder="000000"
                    style={{
                        ...refInputStyle,
                        letterSpacing: '3px', textAlign: 'center',
                        border: ref6.length > 0 && ref6.length < 6 ? '1px solid #f59e0b' : ref6.length === 6 ? '1px solid #22c55e' : '1px solid #dde3ec',
                    }}
                />
                {ref6.length > 0 && ref6.length < 6 && (
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#f59e0b', textAlign: 'center' }}>
                        {6 - ref6.length} dígitos restantes
                    </p>
                )}
            </div>
        </div>
    );
}

const TIPO_ICON = {
    PRODUCTO: TbBottle,
    SERVICIO: FiLayers,
    INSUMO: FiTool,
};

// ── Clases Tailwind reutilizables del wizard ──
const WIZARD_PANEL = 'flex min-h-[400px] flex-col rounded-[20px] border border-border bg-surface p-[30px]';
const WIZARD_FOOTER = 'mt-auto flex justify-between border-t border-border pt-[30px]';
const BTN_WIZARD = 'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition';
const BTN_BACK = `${BTN_WIZARD} bg-[#f1f5f9] text-text hover:bg-[#e2e8f0]`;
const BTN_NEXT = `${BTN_WIZARD} bg-accent text-white shadow-[0_4px_12px_rgba(0,119,204,0.2)] hover:-translate-y-0.5 hover:bg-[#0066b3] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#cbd5e1] disabled:shadow-none`;
const TIPO_BADGE = { producto: 'bg-[#dbeafe] text-[#1d4ed8]', servicio: 'bg-[#ede9fe] text-[#6d28d9]', insumo: 'bg-[#ffedd5] text-[#c2410c]' };
const TIPO_ICON_WRAP = { producto: 'bg-[#e0f2fe] text-accent', servicio: 'bg-[#ede9fe] text-[#7c3aed]', insumo: 'bg-[#ffedd5] text-[#ea580c]' };

export default function VentasWizard() {
    const { user } = useAuth();
    const sucursalId = Number(user?.sucursalId ?? 1);

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Data Sources
    const [clients, setClients] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [catalogFilter, setCatalogFilter] = useState('todos');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [config, setConfig] = useState({ exchangeRate: 54.50, iva: 16 });

    // Order State
    const [selectedClient, setSelectedClient] = useState(null);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [searchClient, setSearchClient] = useState('');

    // Payment details state (bank, reference, amounts for mixed)
    const [paymentDetails, setPaymentDetails] = useState({
        banco: '',
        referencia: '',
        mixedMethods: { efectivo_usd: 0, efectivo_ves: 0, pago_movil: 0, transferencia: 0, punto: 0 },
        mixedBanco: { pago_movil: '', transferencia: '' },
        mixedRef: { pago_movil: '', transferencia: '' },
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    /** Recargar IVA/tasa al entrar al paso de productos (por si cambió en Configuración). */
    useEffect(() => {
        if (currentStep !== 3) return;
        configService.getCurrencyConfig().then((c) => {
            if (c) setConfig((prev) => ({ ...prev, ...c }));
        }).catch(() => {});
    }, [currentStep]);

    const loadCatalog = async (filterId = catalogFilter) => {
        const filtro = catalogoService.TIPO_FILTROS.find((f) => f.id === filterId);
        const tipo = filtro?.tipo ?? null;
        const data = await catalogoService.getCatalogoVentas(sucursalId, tipo);
        setCatalog(data);
    };

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [clientData, confData] = await Promise.all([
                getClients(),
                configService.getCurrencyConfig(),
            ]);
            setClients(clientData);
            setConfig(confData || { exchangeRate: 54.50, iva: 16 });
            await loadCatalog('todos');
        } catch (error) {
            console.error('Error loading data', error);
            Swal.fire('Error', error.message || 'No se pudo cargar el catálogo', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCatalogFilterChange = async (filterId) => {
        setCatalogFilter(filterId);
        setIsLoading(true);
        try {
            await loadCatalog(filterId);
        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo filtrar el catálogo', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Form Controls
    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const isStep1Valid = true;
    const isStep2Valid = selectedClient !== null;
    const isStep3Valid = cart.length > 0;

    const ivaPorcentaje = Number(config?.iva ?? 0);
    const cartTotals = useMemo(
        () => calcularTotalesCarrito(cart, ivaPorcentaje),
        [cart, ivaPorcentaje]
    );
    const cartSubtotalUSD = cartTotals.subtotal;
    const cartIvaUSD = cartTotals.iva;
    const cartTotalUSD = cartTotals.total;
    const cartTotalVES = cartTotalUSD * (config?.exchangeRate || 54.5);

    const calcMixedTotalBs = () => {
        const rate = config?.exchangeRate || 1;
        const mm = paymentDetails.mixedMethods;
        return mm.efectivo_usd * rate + mm.efectivo_ves + mm.pago_movil + mm.transferencia + mm.punto;
    };
    const mixedTotalBs = calcMixedTotalBs();
    const totalNeededBs = cartTotalUSD * (config?.exchangeRate || 1);
    const mixedRemaining = totalNeededBs - mixedTotalBs;

    const isValidRef = (ref) => /^\d{6}$/.test(ref);

    const isSingleMethodValid = () => {
        if (!paymentMethod || paymentMethod === 'mixto') return false;
        if (paymentMethod === 'credito') {
            if (!selectedClient) return false;
            return puedeVenderCredito(selectedClient, cartTotalUSD).ok;
        }
        if (paymentMethod === 'pago_movil' || paymentMethod === 'transferencia') {
            return paymentDetails.banco.length > 0 && isValidRef(paymentDetails.referencia);
        }
        return true;
    };

    const isMixedValid = () => {
        if (paymentMethod !== 'mixto') return false;
        const mm = paymentDetails.mixedMethods;
        const hasSomeAmount = Object.values(mm).some(v => v > 0);
        if (!hasSomeAmount) return false;
        if (mm.pago_movil > 0) {
            if (!paymentDetails.mixedBanco.pago_movil || !isValidRef(paymentDetails.mixedRef.pago_movil)) return false;
        }
        if (mm.transferencia > 0) {
            if (!paymentDetails.mixedBanco.transferencia || !isValidRef(paymentDetails.mixedRef.transferencia)) return false;
        }
        return true;
    };

    const isStep4Valid = paymentMethod !== null && (
        paymentMethod === 'mixto' ? isMixedValid() : isSingleMethodValid()
    );

    // Cart Handlers
    const maxQtyFor = (product) =>
        product.controlaStock === false ? Infinity : Number(product.stock ?? 0);

    const addToCart = (product) => {
        const cartKey = product.cartKey || `${product.id}`;
        const maxQty = maxQtyFor(product);
        setCart((prev) => {
            const existing = prev.find((item) => item.cartKey === cartKey);
            if (existing) {
                if (existing.qty >= maxQty) {
                    if (product.controlaStock !== false) {
                        Swal.fire('Stock insuficiente', `Solo hay ${maxQty} unidad(es) disponibles.`, 'warning');
                    }
                    return prev;
                }
                return prev.map((item) =>
                    item.cartKey === cartKey ? { ...item, qty: item.qty + 1 } : item
                );
            }
            if (product.controlaStock !== false && maxQty <= 0) {
                Swal.fire('Sin stock', 'Este artículo no tiene existencias.', 'warning');
                return prev;
            }
            return [
                ...prev,
                { ...product, cartKey, qty: 1, price: Number(product.price || 0), gravaIva: product.gravaIva !== false },
            ];
        });
    };

    const removeFromCart = (cartKey) => {
        setCart(prev => prev.filter(item => item.cartKey !== cartKey));
    };

    const updateQty = (cartKey, delta) => {
        setCart((prev) =>
            prev.map((item) => {
                if (item.cartKey !== cartKey) return item;
                const newQty = item.qty + delta;
                if (newQty <= 0) return item;
                const maxQty = maxQtyFor(item);
                if (newQty > maxQty) return item;
                return { ...item, qty: newQty };
            })
        );
    };

    const filteredCatalog = catalog.filter((item) => {
        const q = catalogSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            item.name?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q) ||
            item.tipoLabel?.toLowerCase().includes(q)
        );
    });

    const handleConfirmSale = async () => {
        if (paymentMethod === 'credito') {
            const check = puedeVenderCredito(selectedClient, cartTotalUSD);
            if (!check.ok) {
                Swal.fire('Crédito', check.reason, 'warning');
                return;
            }
        }
        setIsLoading(true);
        try {
            await ventaService.createSale({
                client: selectedClient,
                type: 'local',
                items: cart,
                ivaPorcentaje,
                totalUSD: cartTotalUSD,
                totalVES: cartTotalVES,
                paymentMethod,
            });
            Swal.fire({
                icon: 'success',
                title: 'Venta Procesada',
                text: 'La orden se ha registrado correctamente.',
                confirmButtonColor: 'var(--accent)'
            }).then(async () => {
                try {
                    setClients(await getClients());
                } catch {
                    /* ignore refresh */
                }
                setSelectedClient(null);
                setCart([]);
                setPaymentMethod(null);
                setPaymentDetails({
                    banco: '', referencia: '',
                    mixedMethods: { efectivo_usd: 0, efectivo_ves: 0, pago_movil: 0, transferencia: 0, punto: 0 },
                    mixedBanco: { pago_movil: '', transferencia: '' },
                    mixedRef: { pago_movil: '', transferencia: '' },
                });
                setCurrentStep(1);
            });
        } catch (error) {
            Swal.fire('Error', error?.message || 'No se pudo procesar la venta', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        c.cedula?.includes(searchClient)
    );

    // Render Steps
    const renderStep1 = () => (
        <div className={WIZARD_PANEL}>
            <div className="mb-[30px]">
                <h2 className="font-display text-2xl text-text">Tipo de venta</h2>
                <p className="mt-1 text-sm text-muted">Este módulo registra únicamente ventas locales.</p>
            </div>
            <div className="mt-5 flex justify-center gap-5">
                <div className="max-w-[300px] flex-1 cursor-pointer rounded-2xl border-2 border-accent bg-accent/[0.05] p-[30px] text-center">
                    <FiMapPin className="mx-auto mb-4 block text-5xl text-accent" />
                    <h3 className="mb-2 text-text">Compra Local</h3>
                    <p className="text-sm text-muted">El cliente retira en la planta</p>
                </div>
            </div>

            <div className={WIZARD_FOOTER}>
                <div />
                <button className={BTN_NEXT} disabled={!isStep1Valid} onClick={nextStep}>
                    Siguiente Paso
                </button>
            </div>
        </div>
    );

    const getInitials = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];
    const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

    const renderStep2 = () => (
        <div className={WIZARD_PANEL}>
            <h2 className="mb-6 font-display text-[22px]">Seleccionar Cliente</h2>
            <>
                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '17px' }} />
                    <input
                        type="text"
                        value={searchClient}
                        onChange={e => setSearchClient(e.target.value)}
                        placeholder="Buscar cliente por nombre, cédula o teléfono..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px 13px 44px', border: '1px solid #dde3ec', borderRadius: '10px', fontSize: '14px', outline: 'none', background: '#fff' }}
                    />
                </div>

                {/* Client grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', maxHeight: '340px', overflowY: 'auto' }}>
                    {(searchClient.length > 0 ? filteredClients : clients).map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedClient(c)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                                border: selectedClient?.id === c.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                borderRadius: '12px',
                                background: selectedClient?.id === c.id ? '#eff6ff' : '#fff',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: getAvatarColor(c.name), color: 'white', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {getInitials(c.name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{c.cedula}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{c.phone || ''}</div>
                                {c.tieneCredito && (
                                    <div style={{ fontSize: '11px', marginTop: '4px', color: '#0369a1' }}>
                                        Crédito: ${c.creditoDisponible?.toFixed(2)} disp.
                                        {c.saldo > 0 ? ` · Debe $${c.saldo.toFixed(2)}` : ''}
                                    </div>
                                )}
                                {(c.status === 'delinquent' || c.status === 'overlimit') && (
                                    <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: c.status === 'overlimit' ? '#fef2f2' : '#fff7ed', color: c.status === 'overlimit' ? '#b91c1c' : '#c2410c' }}>
                                        {c.status === 'overlimit' ? 'Sobregirado' : 'Moroso'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {clients.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No hay clientes registrados aún.
                        </div>
                    )}
                    {searchClient.length > 0 && filteredClients.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                            No se encontró ningún cliente. Cambia a "Cliente No Registrado".
                        </div>
                    )}
                </div>
            </>

            <div className={WIZARD_FOOTER} style={{ marginTop: '30px' }}>
                <button className={BTN_BACK} onClick={prevStep}>Anterior</button>
                <button className={BTN_NEXT} disabled={!isStep2Valid} onClick={nextStep}>
                    Continuar a Productos
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="flex min-h-[400px] flex-col">
            <div className="mb-5 flex flex-wrap items-center gap-3.5 px-1">
                <div className="flex flex-wrap gap-2" role="tablist">
                    {catalogoService.TIPO_FILTROS.map((f) => {
                        const active = catalogFilter === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[20px] border px-3.5 py-2 text-[13px] font-semibold transition"
                                style={active
                                    ? { background: f.color, borderColor: f.color, color: '#fff' }
                                    : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                                onClick={() => handleCatalogFilterChange(f.id)}
                            >
                                {f.id === 'PRODUCTO' && <TbBottle />}
                                {f.id === 'SERVICIO' && <FiLayers />}
                                {f.id === 'INSUMO' && <FiTool />}
                                {f.id === 'todos' && <FiBox />}
                                {f.label}
                            </button>
                        );
                    })}
                </div>
                <input
                    type="search"
                    className="min-w-[200px] flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    placeholder="Buscar por nombre, SKU o tipo…"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                />
            </div>

            <div className="flex items-start gap-[30px] max-[900px]:flex-col">
                <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
                    {filteredCatalog.map((item) => {
                        const TipoIcon = TIPO_ICON[item.tipo] || FiShoppingCart;
                        const tipoKey = item.tipo?.toLowerCase();
                        const sinStock = item.controlaStock !== false && Number(item.stock) <= 0;
                        return (
                            <div className={`relative rounded-2xl border border-border bg-white p-5 text-center transition hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] ${sinStock ? 'opacity-65' : ''}`} key={item.id}>
                                <span className={`absolute left-3 top-3 rounded-md px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.03em] ${TIPO_BADGE[tipoKey] || TIPO_BADGE.producto}`}>
                                    {item.tipoLabel}
                                </span>
                                <span className="absolute right-[15px] top-[15px] rounded-lg bg-[#10b981] px-2 py-1 text-[11px] font-bold text-white">{item.sku || '—'}</span>
                                <div className={`mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl text-[28px] ${TIPO_ICON_WRAP[tipoKey] || TIPO_ICON_WRAP.producto}`}>
                                    <TipoIcon />
                                </div>
                                <div>
                                    <h4 className="mb-2 text-text">{item.name}</h4>
                                    <p className="mb-1 text-xl font-bold text-accent">${Number(item.price || 0).toFixed(2)}</p>
                                    <p className="mb-4 text-xs text-muted">
                                        Bs. {(Number(item.price || 0) * (config?.exchangeRate || 54.50)).toFixed(2)}
                                    </p>
                                    <p className="mb-4 text-[13px] text-muted">
                                        {item.controlaStock === false ? 'Servicio — sin control de stock' : `Stock: ${Number(item.stock || 0)}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:bg-[#0066b3] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                                    disabled={sinStock}
                                    onClick={() => addToCart({ ...item, title: item.name })}
                                >
                                    <FiPlus /> {sinStock ? 'Sin stock' : 'Agregar'}
                                </button>
                            </div>
                        );
                    })}
                    {filteredCatalog.length === 0 && (
                        <div className="col-span-full px-10 py-10 text-center text-muted">
                            <FiShoppingCart className="mx-auto mb-2.5 text-4xl opacity-25" />
                            <p>No hay artículos en esta categoría.</p>
                        </div>
                    )}
                </div>

                <div className="w-[320px] rounded-2xl border border-border bg-[#f8fafc] p-5 max-[900px]:w-full">
                    <h3 className="mb-5 font-display text-lg">Items Agregados</h3>
                    <div className="mb-5 flex max-h-[300px] flex-col gap-4 overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="text-center text-muted">Carrito vacío</p>
                        ) : cart.map(item => {
                            const tipoKey = item.tipo?.toLowerCase();
                            return (
                                <div className="rounded-xl border border-border bg-white p-3" key={item.cartKey || item.id}>
                                    <div className="mb-2.5 flex justify-between">
                                        <div>
                                            <span className="text-sm font-semibold">{item.title}</span>
                                            {item.tipoLabel && (
                                                <span className={`ml-1.5 inline-block rounded px-1.5 py-0.5 align-middle text-[10px] font-bold ${TIPO_BADGE[tipoKey] || TIPO_BADGE.producto}`}>
                                                    {item.tipoLabel}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[13px] text-muted">${item.price.toFixed(2)} c/u</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 rounded-lg bg-[#f1f5f9] p-1">
                                            <button className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-white" onClick={() => updateQty(item.cartKey || item.id, -1)}><FiMinus /></button>
                                            <span style={{ fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.qty}</span>
                                            <button className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-white" onClick={() => updateQty(item.cartKey || item.id, 1)}><FiPlus /></button>
                                        </div>
                                        <button className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-[#fee2e2] text-[#ef4444]" onClick={() => removeFromCart(item.cartKey || item.id)}><FiTrash2 /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl bg-accent p-5 text-white">
                        <div className="flex flex-col gap-1.5 border-b border-white/25 pb-2.5 text-[13px] opacity-95">
                            <div className="flex items-center justify-between">
                                <span>Subtotal</span>
                                <span>${cartSubtotalUSD.toFixed(2)}</span>
                            </div>
                            {ivaPorcentaje > 0 && cartIvaUSD > 0 && (
                                <div className="flex items-center justify-between font-semibold">
                                    <span>IVA ({ivaPorcentaje}%)</span>
                                    <span>${cartIvaUSD.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-base font-medium">Total:</span>
                            <div>
                                <div className="text-right text-2xl font-bold">${cartTotalUSD.toFixed(2)}</div>
                                <div className="text-right text-[13px] opacity-80">Bs. {cartTotalVES.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className={BTN_BACK} style={{ flex: 1, justifyContent: 'center' }} onClick={prevStep}>Atrás</button>
                        <button className={BTN_NEXT} style={{ flex: 1, justifyContent: 'center' }} disabled={!isStep3Valid} onClick={nextStep}>
                            Pagar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => {
        const rate = config?.exchangeRate || 1;
        const totalBs = cartTotalUSD * rate;

        const creditCheck = selectedClient
            ? puedeVenderCredito(selectedClient, cartTotalUSD)
            : { ok: false, reason: 'Seleccione un cliente.' };

        const paymentMethods = [
            { id: 'efectivo_usd', label: 'Efectivo (USD)', icon: FiDollarSign },
            { id: 'efectivo_ves', label: 'Efectivo (Bs)', icon: FiDollarSign },
            { id: 'pago_movil', label: 'Pago Móvil', icon: FiSmartphone },
            { id: 'transferencia', label: 'Transferencia', icon: FiCreditCard },
            { id: 'punto', label: 'Punto de Venta', icon: FiCreditCard },
            { id: 'credito', label: 'Crédito', icon: FiCreditCard },
            { id: 'mixto', label: 'Pago Mixto', icon: FiPlus }
        ];

        const mixedMethodsList = [
            { id: 'efectivo_usd', label: 'Efectivo USD ($)', currency: 'USD' },
            { id: 'efectivo_ves', label: 'Efectivo Bs', currency: 'BS' },
            { id: 'pago_movil', label: 'Pago Móvil', currency: 'BS', needsBank: true },
            { id: 'transferencia', label: 'Transferencia', currency: 'BS', needsBank: true },
            { id: 'punto', label: 'Punto de Venta', currency: 'BS' },
        ];

        const inputStyle = refInputStyle;

        return (
            <div className={WIZARD_PANEL}>
                <div className="mb-[30px]">
                    <h2 className="font-display text-2xl text-text">Método de Pago</h2>
                    <p className="mt-1 text-sm text-muted">Selecciona cómo el cliente pagará el total de <strong>${cartTotalUSD.toFixed(2)}</strong> / <strong>Bs. {totalBs.toFixed(2)}</strong>.</p>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
                    {paymentMethods.map(method => (
                        <div
                            key={method.id}
                            className={`cursor-pointer rounded-2xl border-2 p-6 text-center transition ${paymentMethod === method.id ? 'border-accent bg-accent/[0.05]' : 'border-border hover:border-[#cbd5e1]'}`}
                            onClick={async () => {
                                setPaymentMethod(method.id);
                                setPaymentDetails((prev) => ({ ...prev, banco: '', referencia: '' }));
                                if (method.id === 'credito' && selectedClient?.id != null) {
                                    try {
                                        const list = await getClients();
                                        const fresh = list.find((c) => String(c.id) === String(selectedClient.id));
                                        if (fresh) setSelectedClient(fresh);
                                    } catch {
                                        /* usar datos en memoria */
                                    }
                                }
                            }}
                        >
                            <method.icon className="mx-auto mb-3 text-[32px] text-accent" />
                            <h4 className="text-text">{method.label}</h4>
                        </div>
                    ))}
                </div>

                {paymentMethod === 'credito' && (
                    <CreditoPagoPanel
                        client={selectedClient}
                        totalUSD={cartTotalUSD}
                        totalBs={totalBs}
                        onIrSeleccionarCliente={() => setCurrentStep(2)}
                    />
                )}

                {paymentMethod && paymentMethod !== 'mixto' && paymentMethod !== 'credito' && (
                    <div style={{ marginTop: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', background: paymentMethod === 'efectivo_usd' ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: paymentMethod === 'efectivo_usd' ? '#3b82f6' : '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    <FiDollarSign />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: '#64748b' }}>Total a pagar</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                        {paymentMethod === 'efectivo_usd' ? 'Efectivo en dólares'
                                            : paymentMethod === 'efectivo_ves' ? 'Efectivo en bolívares'
                                            : paymentMethod === 'pago_movil' ? 'Pago móvil en bolívares'
                                            : paymentMethod === 'transferencia' ? 'Transferencia en bolívares'
                                            : 'Punto de venta en bolívares'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {paymentMethod === 'efectivo_usd' ? (
                                    <>
                                        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#1e293b' }}>${cartTotalUSD.toFixed(2)}</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Ref: Bs. {totalBs.toFixed(2)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#15803d' }}>Bs. {totalBs.toFixed(2)}</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Tasa: 1 USD = Bs. {rate}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {(paymentMethod === 'pago_movil' || paymentMethod === 'transferencia') && (
                            <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                                <BankRefFields
                                    banco={paymentDetails.banco}
                                    ref6={paymentDetails.referencia}
                                    onBancoChange={(v) => setPaymentDetails(prev => ({ ...prev, banco: v }))}
                                    onRefChange={(v) => setPaymentDetails(prev => ({ ...prev, referencia: v }))}
                                />
                            </div>
                        )}

                        {paymentMethod !== 'efectivo_usd' && (
                            <div style={{ padding: '14px 24px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                    <span>Subtotal USD</span><span>${cartTotalUSD.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                    <span>Tasa de cambio</span><span>× Bs. {rate}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#1e293b', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                                    <span>Total Bs</span><span>Bs. {totalBs.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {paymentMethod === 'mixto' && (
                    <div style={{ marginTop: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>Pago Mixto</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                Divide el pago entre los diferentes métodos. Total a cubrir: <strong>Bs. {totalNeededBs.toFixed(2)}</strong>
                            </p>
                        </div>

                        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {mixedMethodsList.map(m => {
                                const val = paymentDetails.mixedMethods[m.id] || 0;
                                return (
                                    <div key={m.id} style={{ padding: '14px 16px', borderRadius: '10px', border: val > 0 ? '1.5px solid #3b82f6' : '1px solid #e2e8f0', background: val > 0 ? '#fafbff' : '#fff', transition: 'all 0.15s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>{m.label}</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{m.currency === 'USD' ? '$' : 'Bs.'}</span>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    value={val || ''}
                                                    onChange={(e) => {
                                                        const newVal = parseFloat(e.target.value) || 0;
                                                        setPaymentDetails(prev => ({ ...prev, mixedMethods: { ...prev.mixedMethods, [m.id]: newVal } }));
                                                    }}
                                                    placeholder="0.00"
                                                    style={{ ...inputStyle, width: '140px', textAlign: 'right' }}
                                                />
                                            </div>
                                        </div>
                                        {m.currency === 'USD' && val > 0 && (
                                            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                                                Equivale a Bs. {(val * rate).toFixed(2)}
                                            </p>
                                        )}
                                        {m.needsBank && val > 0 && (
                                            <BankRefFields
                                                banco={paymentDetails.mixedBanco[m.id]}
                                                ref6={paymentDetails.mixedRef[m.id]}
                                                onBancoChange={(v) => setPaymentDetails(prev => ({ ...prev, mixedBanco: { ...prev.mixedBanco, [m.id]: v } }))}
                                                onRefChange={(v) => setPaymentDetails(prev => ({ ...prev, mixedRef: { ...prev.mixedRef, [m.id]: v } }))}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: '16px 24px', background: mixedRemaining <= 0.01 && mixedRemaining >= -0.01 ? '#f0fdf4' : '#fff7ed', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {mixedMethodsList.map(m => {
                                const val = paymentDetails.mixedMethods[m.id] || 0;
                                if (val <= 0) return null;
                                const bsVal = m.currency === 'USD' ? val * rate : val;
                                return (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                        <span>{m.label}</span>
                                        <span>{m.currency === 'USD' ? `$${val.toFixed(2)} → ` : ''}Bs. {bsVal.toFixed(2)}</span>
                                    </div>
                                );
                            })}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, paddingTop: '8px', borderTop: '1px dashed #e2e8f0', color: '#1e293b' }}>
                                <span>Total cubierto</span>
                                <span>Bs. {mixedTotalBs.toFixed(2)} / Bs. {totalNeededBs.toFixed(2)}</span>
                            </div>
                            {mixedRemaining > 0.01 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '10px 14px', borderRadius: '8px', background: '#fef3c7', fontSize: '13px', fontWeight: 600, color: '#92400e' }}>
                                    ⚠️ Faltan Bs. {mixedRemaining.toFixed(2)} por cubrir
                                </div>
                            )}
                            {mixedRemaining <= 0.01 && mixedRemaining >= -0.01 && Object.values(paymentDetails.mixedMethods).some(v => v > 0) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '10px 14px', borderRadius: '8px', background: '#dcfce7', fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                                    <FiCheck /> Monto completo cubierto
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={WIZARD_FOOTER}>
                    <button className={BTN_BACK} onClick={prevStep}>Anterior</button>
                    <button
                        className={BTN_NEXT}
                        disabled={!isStep4Valid}
                        onClick={nextStep}
                        title={paymentMethod === 'credito' && !isStep4Valid ? (creditCheck.reason || 'Revise el crédito del cliente') : ''}
                    >
                        {paymentMethod === 'credito' ? 'Confirmar venta a crédito' : 'Verificar Orden'}
                    </button>
                </div>
            </div>
        );
    };

    const renderStep5 = () => (
        <div className={WIZARD_PANEL}>
            <div className="mb-[30px] text-center">
                <h2 className="font-display text-2xl text-text">Confirmación de la Venta</h2>
                <p className="mt-1 text-sm text-muted">Revisa los detalles antes de imprimir el comprobante.</p>
            </div>

            <div className="flex items-center justify-center p-5">
                <div className="w-[300px] bg-[#ffffe0] px-5 py-[30px] font-mono text-black shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
                    <div className="mb-5 border-b border-dashed border-black pb-2.5 text-center">
                        <h3 className="mb-1 text-lg">H2O MANAGER</h3>
                        <p className="my-0.5 text-xs">Rif: J-12345678-9</p>
                        <p className="my-0.5 text-xs">Fecha: {new Date().toLocaleString('es-VE')}</p>
                        <p className="my-0.5 text-xs">Cliente: {selectedClient?.name}</p>
                        <p className="my-0.5 text-xs">C.I: {selectedClient?.cedula}</p>
                        <p className="my-0.5 text-xs">Tipo: Venta Local</p>
                    </div>

                    <table className="mb-2.5 w-full text-[13px]">
                        <thead>
                            <tr>
                                <th className="border-b border-dashed border-black pb-1.5 text-left">CANT</th>
                                <th className="border-b border-dashed border-black pb-1.5 text-left">DESCRIPCION</th>
                                <th className="border-b border-dashed border-black pb-1.5 text-right">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-1">{item.qty}</td>
                                    <td className="py-1">{item.title}</td>
                                    <td className="py-1 text-right">${(item.price * item.qty).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mb-5 border-t border-dashed border-black pt-2.5 text-sm">
                        <div className="mb-1 flex justify-between">
                            <span>SUBTOTAL:</span>
                            <span>${cartSubtotalUSD.toFixed(2)}</span>
                        </div>
                        {cartIvaUSD > 0 && (
                            <div className="mb-1 flex justify-between">
                                <span>IVA ({ivaPorcentaje}%):</span>
                                <span>${cartIvaUSD.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="mb-1 flex justify-between text-base font-bold">
                            <span>TOTAL USD:</span>
                            <span>${cartTotalUSD.toFixed(2)}</span>
                        </div>
                        <div className="mb-1 mt-[5px] flex justify-between text-[13px] font-bold">
                            <span>TOTAL BS:</span>
                            <span>Bs. {cartTotalVES.toFixed(2)}</span>
                        </div>
                        <div className="mt-2.5 text-xs">Tasa Ref: Bs. {config?.exchangeRate}</div>
                        <div className="text-xs">
                            Pago: {paymentMethod === 'credito' ? 'CRÉDITO (pendiente de cobro)' : paymentMethod?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        {paymentMethod === 'credito' && selectedClient && (
                            <div className="mt-1.5 text-[11px] leading-snug">
                                Plazo: {Number(selectedClient.diasCredito) > 0 ? selectedClient.diasCredito : 30} días ·
                                Nuevo saldo est.: ${(Number(selectedClient.saldo || 0) + cartTotalUSD).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-dashed border-black pt-2.5 text-center text-xs">
                        ¡Gracias por su compra!<br/>
                        www.h2omanager.com
                    </div>
                </div>
            </div>

            <div className={WIZARD_FOOTER}>
                <button className={BTN_BACK} onClick={() => {
                    setSelectedClient(null);
                    setCart([]);
                    setPaymentMethod(null);
                    setPaymentDetails({
                        banco: '', referencia: '',
                        mixedMethods: { efectivo_usd: 0, efectivo_ves: 0, pago_movil: 0, transferencia: 0, punto: 0 },
                        mixedBanco: { pago_movil: '', transferencia: '' },
                        mixedRef: { pago_movil: '', transferencia: '' },
                    });
                    setCurrentStep(1);
                }}><FiPlus /> Nueva Venta</button>
                <button className={`${BTN_WIZARD} text-white shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60`} style={{ background: '#10b981' }} disabled={isLoading} onClick={handleConfirmSale}>
                    <FiPrinter /> Procesar e Imprimir
                </button>
            </div>
        </div>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return renderStep1();
        }
    };

    return (
        <div className="animate-fade-up p-2.5">
            <div className="relative mx-auto mb-10 flex max-w-[800px] items-center justify-between">
                <div className="absolute left-10 right-10 top-6 z-0 h-1 rounded bg-[#e2e8f0]" />
                {STEPS.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    const iconState = isActive
                        ? 'bg-accent text-white shadow-[0_0_0_4px_rgba(0,119,204,0.2)]'
                        : isCompleted
                          ? 'bg-[#10b981] text-white'
                          : 'bg-[#f1f5f9] text-[#94a3b8]';
                    const labelState = isActive ? 'text-accent' : isCompleted ? 'text-text' : 'text-[#94a3b8]';
                    return (
                        <div key={step.id} className="relative z-[1] flex w-20 flex-col items-center gap-3 max-[600px]:w-auto">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-bg text-xl transition ${iconState}`}>
                                {isCompleted ? <FiCheck /> : <step.icon />}
                            </div>
                            <span className={`text-center text-[13px] font-semibold max-[600px]:hidden ${labelState}`}>{step.label}</span>
                        </div>
                    );
                })}
                
            </div>

            {renderCurrentStep()}
        </div>
    );
}
