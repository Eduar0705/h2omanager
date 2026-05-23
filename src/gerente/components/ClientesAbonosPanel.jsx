import { useEffect, useState } from 'react';
import { FiCheck, FiDollarSign, FiRefreshCw, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { creditoDisponible } from '../services/clientes.service';
import * as abonoService from '../services/clientes-abonos.service';
import { FORM_GROUP, FORM_ROW } from '../../ui/mod';

const METODOS_ABONO = [
    { id: 'efectivo_usd', label: 'Efectivo (USD)' },
    { id: 'efectivo_ves', label: 'Efectivo (Bs)' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'pago_movil', label: 'Pago móvil' },
    { id: 'punto', label: 'Punto de venta' },
];

const TABLE = 'w-full border-collapse text-sm';
const TH = 'border-b border-border bg-[#f8fafc] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted';
const TD = 'border-b border-[#f1f5f9] px-4 py-3 text-text';
const BADGE = 'inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold';
const BTN_TABLE = 'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-accent hover:text-accent';
const BTN_ADD = 'mt-2 flex items-center gap-2 rounded-[10px] border-none bg-accent px-5 py-2.5 font-semibold text-white shadow-[0_4px_12px_rgba(0,119,204,0.2)] transition hover:bg-[#0066b3] disabled:cursor-not-allowed disabled:opacity-60';
const SEARCH_INPUT = 'w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/[0.08]';

const mensajeError = (error, fallback) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return fallback;
};

function formatFecha(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return '—';
    try {
        return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

export default function ClientesAbonosPanel({ clients, onAbonoRegistrado, initialClientId = null }) {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(
        initialClientId != null ? String(initialClientId) : ''
    );
    const [cuentas, setCuentas] = useState([]);
    const [loadingCxc, setLoadingCxc] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        monto: '', metodo: 'efectivo_usd', cxcId: '', banco: '', referenciaBancaria: '',
    });

    const conDeuda = clients.filter((c) => Number(c.saldo) > 0.009);
    const selected = clients.find((c) => String(c.id) === String(selectedId));

    const filteredDeuda = conDeuda.filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q) || (c.cedula || '').toLowerCase().includes(q);
    });

    useEffect(() => {
        if (initialClientId != null) {
            setSelectedId(String(initialClientId));
        }
    }, [initialClientId]);

    useEffect(() => {
        if (!selectedId) {
            setCuentas([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingCxc(true);
            try {
                const rows = await abonoService.getCuentasPorCobrar(selectedId);
                if (!cancelled) {
                    setCuentas(rows);
                    setForm((prev) => ({ ...prev, cxcId: '', monto: '' }));
                }
            } catch (error) {
                if (!cancelled) {
                    setCuentas([]);
                    Swal.fire('Error', mensajeError(error, 'No se pudieron cargar las facturas pendientes'), 'error');
                }
            } finally {
                if (!cancelled) setLoadingCxc(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    const totalCxc = cuentas.reduce((acc, c) => acc + Number(c.saldo || 0), 0);
    const saldoCliente = Number(selected?.saldo || 0);
    const maxAbono = Math.min(saldoCliente, totalCxc > 0 ? totalCxc : saldoCliente);

    const handleSelectClient = (id) => setSelectedId(String(id));

    const handleAbonarFactura = (cxc) => {
        setForm((prev) => ({
            ...prev,
            cxcId: String(cxc.id),
            monto: String(Number(cxc.saldo).toFixed(2)),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected) {
            Swal.fire('Cliente', 'Selecciona un cliente con saldo pendiente.', 'warning');
            return;
        }
        const monto = Number(form.monto);
        if (!Number.isFinite(monto) || monto <= 0) {
            Swal.fire('Monto', 'Ingresa un monto válido mayor a cero.', 'warning');
            return;
        }
        if (monto > maxAbono + 0.009) {
            Swal.fire('Monto', `El abono no puede superar $${maxAbono.toFixed(2)}.`, 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: '¿Registrar abono?',
            html: `Cliente: <strong>${selected.name}</strong><br/>Monto: <strong>$${monto.toFixed(2)}</strong>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
        });

        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            const payload = {
                monto,
                metodo: form.metodo,
                referenciaBancaria: form.referenciaBancaria.trim() || undefined,
                banco: form.banco.trim() || undefined,
            };
            if (form.cxcId) payload.cxcId = Number(form.cxcId);

            const result = await abonoService.registrarAbono(selected.id, payload);
            Swal.fire({
                icon: 'success',
                title: 'Abono registrado',
                text: `Nuevo saldo del cliente: $${Number(result.saldoCliente).toFixed(2)}`,
                timer: 2200,
                showConfirmButton: false,
            });
            setForm({ monto: '', metodo: 'efectivo_usd', cxcId: '', banco: '', referenciaBancaria: '' });
            const rows = await abonoService.getCuentasPorCobrar(selected.id);
            setCuentas(rows);
            onAbonoRegistrado?.();
        } catch (error) {
            Swal.fire('Error', mensajeError(error, 'No se pudo registrar el abono'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-up">
            <div className="grid grid-cols-[280px_1fr] items-start gap-6 max-[900px]:grid-cols-1">
                <aside className="max-h-[70vh] overflow-y-auto rounded-[14px] border border-[#e2e8f0] bg-white p-4 max-[900px]:max-h-none">
                    <div>
                        <h3 className="mb-1 text-base font-semibold text-text">Clientes con deuda</h3>
                        <p className="mb-3 text-xs text-[#94a3b8]">{conDeuda.length} pendiente(s)</p>
                    </div>
                    <div className="relative mb-3">
                        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            className={SEARCH_INPUT}
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ul className="m-0 list-none p-0">
                        {filteredDeuda.length === 0 && (
                            <li className="py-3 text-[13px] text-[#94a3b8]">No hay clientes con saldo pendiente.</li>
                        )}
                        {filteredDeuda.map((c) => {
                            const active = String(selectedId) === String(c.id);
                            return (
                                <li key={c.id}>
                                    <button
                                        type="button"
                                        className={`mb-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left transition hover:border-[#3b82f6] hover:bg-[#eff6ff] ${active ? 'border-[#3b82f6] bg-[#eff6ff]' : 'border-[#e2e8f0]'}`}
                                        onClick={() => handleSelectClient(c.id)}
                                    >
                                        <span className="text-[13px] font-semibold text-[#1e293b]">{c.name}</span>
                                        <span className="text-[13px] font-bold text-[#dc2626]">${Number(c.saldo).toFixed(2)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                <section className="min-h-[420px] rounded-[14px] border border-[#e2e8f0] bg-white p-6">
                    {!selected ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-[#94a3b8]">
                            <FiDollarSign className="text-5xl opacity-35" />
                            <p>Selecciona un cliente de la lista para registrar un abono.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 flex flex-wrap justify-between gap-4 border-b border-[#f1f5f9] pb-5">
                                <div>
                                    <h3 className="mb-1 font-semibold text-text">{selected.name}</h3>
                                    <p className="text-muted">{selected.cedula}</p>
                                </div>
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold uppercase text-[#94a3b8]">Saldo pendiente</span>
                                        <strong className="text-lg text-[#dc2626]">${saldoCliente.toFixed(2)}</strong>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold uppercase text-[#94a3b8]">Crédito disponible</span>
                                        <strong className="text-lg">${creditoDisponible(selected).toFixed(2)}</strong>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold uppercase text-[#94a3b8]">En facturas abiertas</span>
                                        <strong className="text-lg">${totalCxc.toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-7">
                                <h4 className="mb-3 text-[15px] font-semibold text-text">Facturas / cuentas por cobrar</h4>
                                {loadingCxc ? (
                                    <p className="flex items-center gap-2 text-muted">
                                        <FiRefreshCw className="animate-spin" /> Cargando...
                                    </p>
                                ) : cuentas.length === 0 ? (
                                    <p className="text-muted">Sin cuentas pendientes vinculadas (el saldo puede ser histórico).</p>
                                ) : (
                                    <table className={`${TABLE} mt-2`}>
                                        <thead>
                                            <tr>
                                                <th className={TH}>Factura</th>
                                                <th className={TH}>Vence</th>
                                                <th className={TH}>Saldo</th>
                                                <th className={TH}>Estado</th>
                                                <th className={TH} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cuentas.map((cxc) => (
                                                <tr key={cxc.id}>
                                                    <td className={TD}>{cxc.serieCorrelativo || `#${cxc.docId}`}</td>
                                                    <td className={TD}>{formatFecha(cxc.vencimiento)}</td>
                                                    <td className={`${TD} font-bold`}>${Number(cxc.saldo).toFixed(2)}</td>
                                                    <td className={TD}>
                                                        <span className={`${BADGE} ${(cxc.estado || '').toLowerCase() === 'vencida' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                                                            {cxc.estado}
                                                        </span>
                                                    </td>
                                                    <td className={TD}>
                                                        <button type="button" className={BTN_TABLE} title="Abonar esta factura" onClick={() => handleAbonarFactura(cxc)}>
                                                            <FiDollarSign />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <form className="border-t border-[#f1f5f9] pt-5" onSubmit={handleSubmit}>
                                <h4 className="mb-3 text-[15px] font-semibold text-text">Registrar abono</h4>
                                <div className={FORM_ROW}>
                                    <div className={FORM_GROUP}>
                                        <label>Monto ($) *</label>
                                        <input
                                            type="number" step="0.01" min="0.01" max={maxAbono}
                                            value={form.monto}
                                            onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                            placeholder={`Máx. ${maxAbono.toFixed(2)}`}
                                            required
                                        />
                                    </div>
                                    <div className={FORM_GROUP}>
                                        <label>Método de pago *</label>
                                        <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
                                            {METODOS_ABONO.map((m) => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={FORM_ROW}>
                                    <div className={FORM_GROUP}>
                                        <label>Factura específica (opcional)</label>
                                        <select value={form.cxcId} onChange={(e) => setForm({ ...form, cxcId: e.target.value })}>
                                            <option value="">Aplicar a las más antiguas (automático)</option>
                                            {cuentas.map((cxc) => (
                                                <option key={cxc.id} value={cxc.id}>
                                                    {cxc.serieCorrelativo || `Doc ${cxc.docId}`} — ${Number(cxc.saldo).toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={FORM_GROUP}>
                                        <label>Banco (opcional)</label>
                                        <input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Ej. Banesco" />
                                    </div>
                                </div>
                                <div className={FORM_GROUP}>
                                    <label>Referencia (opcional)</label>
                                    <input value={form.referenciaBancaria} onChange={(e) => setForm({ ...form, referenciaBancaria: e.target.value })} placeholder="Nº de referencia" />
                                </div>
                                <button type="submit" className={BTN_ADD} disabled={saving || maxAbono <= 0}>
                                    <FiCheck /> {saving ? 'Registrando...' : 'Registrar abono'}
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
