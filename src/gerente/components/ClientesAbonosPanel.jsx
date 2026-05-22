import { useEffect, useState } from 'react';
import { FiCheck, FiDollarSign, FiRefreshCw, FiSearch } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { creditoDisponible } from '../services/clientes.service';
import * as abonoService from '../services/clientes-abonos.service';

const METODOS_ABONO = [
    { id: 'efectivo_usd', label: 'Efectivo (USD)' },
    { id: 'efectivo_ves', label: 'Efectivo (Bs)' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'pago_movil', label: 'Pago móvil' },
    { id: 'punto', label: 'Punto de venta' },
];

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
        monto: '',
        metodo: 'efectivo_usd',
        cxcId: '',
        banco: '',
        referenciaBancaria: '',
    });

    const conDeuda = clients.filter((c) => Number(c.saldo) > 0.009);
    const selected = clients.find((c) => String(c.id) === String(selectedId));

    const filteredDeuda = conDeuda.filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            (c.name || '').toLowerCase().includes(q) ||
            (c.cedula || '').toLowerCase().includes(q)
        );
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

    const handleSelectClient = (id) => {
        setSelectedId(String(id));
    };

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
            setForm({
                monto: '',
                metodo: 'efectivo_usd',
                cxcId: '',
                banco: '',
                referenciaBancaria: '',
            });
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
        <div className="clientes-abonos-panel">
            <div className="clientes-abonos-layout">
                <aside className="clientes-abonos-sidebar">
                    <div className="clientes-abonos-sidebar-head">
                        <h3>Clientes con deuda</h3>
                        <p>{conDeuda.length} pendiente(s)</p>
                    </div>
                    <div className="search-box" style={{ marginBottom: '12px' }}>
                        <FiSearch />
                        <input
                            className="search-input"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ul className="clientes-abonos-list">
                        {filteredDeuda.length === 0 && (
                            <li className="clientes-abonos-list-empty">No hay clientes con saldo pendiente.</li>
                        )}
                        {filteredDeuda.map((c) => (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    className={`clientes-abonos-list-item ${String(selectedId) === String(c.id) ? 'active' : ''}`}
                                    onClick={() => handleSelectClient(c.id)}
                                >
                                    <span className="clientes-abonos-list-name">{c.name}</span>
                                    <span className="clientes-abonos-list-saldo">${Number(c.saldo).toFixed(2)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>

                <section className="clientes-abonos-main">
                    {!selected ? (
                        <div className="clientes-abonos-placeholder">
                            <FiDollarSign />
                            <p>Selecciona un cliente de la lista para registrar un abono.</p>
                        </div>
                    ) : (
                        <>
                            <div className="clientes-abonos-resumen">
                                <div>
                                    <h3>{selected.name}</h3>
                                    <p className="td-muted">{selected.cedula}</p>
                                </div>
                                <div className="clientes-abonos-resumen-stats">
                                    <div>
                                        <span>Saldo pendiente</span>
                                        <strong style={{ color: '#dc2626' }}>${saldoCliente.toFixed(2)}</strong>
                                    </div>
                                    <div>
                                        <span>Crédito disponible</span>
                                        <strong>${creditoDisponible(selected).toFixed(2)}</strong>
                                    </div>
                                    <div>
                                        <span>En facturas abiertas</span>
                                        <strong>${totalCxc.toFixed(2)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="clientes-abonos-cxc-wrap">
                                <h4>Facturas / cuentas por cobrar</h4>
                                {loadingCxc ? (
                                    <p className="td-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FiRefreshCw className="spin" /> Cargando...
                                    </p>
                                ) : cuentas.length === 0 ? (
                                    <p className="td-muted">Sin cuentas pendientes vinculadas (el saldo puede ser histórico).</p>
                                ) : (
                                    <table className="clients-table clientes-abonos-cxc-table">
                                        <thead>
                                            <tr>
                                                <th>Factura</th>
                                                <th>Vence</th>
                                                <th>Saldo</th>
                                                <th>Estado</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cuentas.map((cxc) => (
                                                <tr key={cxc.id}>
                                                    <td>{cxc.serieCorrelativo || `#${cxc.docId}`}</td>
                                                    <td>{formatFecha(cxc.vencimiento)}</td>
                                                    <td style={{ fontWeight: 700 }}>${Number(cxc.saldo).toFixed(2)}</td>
                                                    <td>
                                                        <span className={`badge cxc-estado-${(cxc.estado || '').toLowerCase()}`}>
                                                            {cxc.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-table-action"
                                                            title="Abonar esta factura"
                                                            onClick={() => handleAbonarFactura(cxc)}
                                                        >
                                                            <FiDollarSign />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <form className="clientes-abonos-form" onSubmit={handleSubmit}>
                                <h4>Registrar abono</h4>
                                <div className="mod-form-row">
                                    <div className="mod-form-group">
                                        <label>Monto ($) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={maxAbono}
                                            value={form.monto}
                                            onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                            placeholder={`Máx. ${maxAbono.toFixed(2)}`}
                                            required
                                        />
                                    </div>
                                    <div className="mod-form-group">
                                        <label>Método de pago *</label>
                                        <select
                                            value={form.metodo}
                                            onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                                        >
                                            {METODOS_ABONO.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mod-form-row">
                                    <div className="mod-form-group">
                                        <label>Factura específica (opcional)</label>
                                        <select
                                            value={form.cxcId}
                                            onChange={(e) => setForm({ ...form, cxcId: e.target.value })}
                                        >
                                            <option value="">Aplicar a las más antiguas (automático)</option>
                                            {cuentas.map((cxc) => (
                                                <option key={cxc.id} value={cxc.id}>
                                                    {cxc.serieCorrelativo || `Doc ${cxc.docId}`} — $
                                                    {Number(cxc.saldo).toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mod-form-group">
                                        <label>Banco (opcional)</label>
                                        <input
                                            value={form.banco}
                                            onChange={(e) => setForm({ ...form, banco: e.target.value })}
                                            placeholder="Ej. Banesco"
                                        />
                                    </div>
                                </div>
                                <div className="mod-form-group">
                                    <label>Referencia (opcional)</label>
                                    <input
                                        value={form.referenciaBancaria}
                                        onChange={(e) => setForm({ ...form, referenciaBancaria: e.target.value })}
                                        placeholder="Nº de referencia"
                                    />
                                </div>
                                <button type="submit" className="btn-add-client" disabled={saving || maxAbono <= 0}>
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
