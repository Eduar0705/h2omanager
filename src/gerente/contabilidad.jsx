import { useEffect, useMemo, useState } from 'react';
import {
    FiBook,
    FiClipboard,
    FiLayers,
    FiPlus,
    FiRefreshCw,
    FiTrash2,
    FiTrendingUp,
    FiCheck,
    FiEye,
    FiInfo,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import ModFormModal from '../components/ModFormModal';
import ContabilidadGuia from './components/ContabilidadGuia';
import * as contabService from './services/contabilidad.service';
import { FORM_GROUP, FORM_ROW, FORM_HINT, BTN_MOD, BTN_MOD_PRIMARY } from '../ui/mod';

const SEGMENTS = [
    { id: 'cuentas', label: 'Plan de cuentas', icon: FiLayers },
    { id: 'asientos', label: 'Libro diario', icon: FiBook },
    { id: 'balance', label: 'Balance general', icon: FiClipboard },
    { id: 'resultados', label: 'Estado de resultados', icon: FiTrendingUp },
];

const TABLE = 'w-full border-collapse text-sm';
const TH = 'border-b border-border bg-[#f8fafc] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted';
const TD = 'border-b border-[#f1f5f9] px-4 py-3 text-text';
const BADGE_RES = 'inline-flex items-center rounded-md bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#3b82f6]';
const BTN_ADD = 'flex items-center gap-2 rounded-[10px] border border-accent bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0066b3]';
const BTN_TABLE = 'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-accent hover:text-accent';
const BTN_TABLE_DEL = 'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:border-[#ef4444] hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-40';
const PANEL = 'rounded-[14px] border border-[#e2e8f0] bg-white p-5';
const SEG_TITULO = 'mb-2 mt-5 text-sm font-bold uppercase tracking-[0.04em] text-[#475569]';
const TOTAL_BASE = 'mt-3 flex items-center justify-between rounded-[10px] px-[18px] py-3.5 font-bold';
const TOTAL_VARIANT = {
    activo: 'bg-[#eff6ff] text-[#1d4ed8]',
    pasivo: 'bg-[#f0fdf4] text-[#15803d]',
    utilidad: 'bg-[#fef3c7] text-[#92400e]',
    negativa: 'bg-[#fef2f2] text-[#b91c1c]',
};

function defaultFechas() {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { desde: fmt(inicio), hasta: fmt(hoy) };
}

const emptyLinea = () => ({ cuentaId: '', debe: '', haber: '' });

export default function Contabilidad() {
    const fechasDef = useMemo(() => defaultFechas(), []);
    const [segment, setSegment] = useState('balance');
    const [filtros, setFiltros] = useState({
        fechaDesde: fechasDef.desde,
        fechaHasta: fechasDef.hasta,
        sucursalId: '1',
    });
    const [loading, setLoading] = useState(false);

    const [cuentas, setCuentas] = useState([]);
    const [asientos, setAsientos] = useState([]);
    const [balance, setBalance] = useState(null);
    const [resultados, setResultados] = useState(null);

    const [showCuentaModal, setShowCuentaModal] = useState(false);
    const [cuentaForm, setCuentaForm] = useState({ codigo: '', nombre: '', tipo: 'Activo' });

    const [showGuia, setShowGuia] = useState(true);
    const [showAsientoModal, setShowAsientoModal] = useState(false);
    const [asientoDetalle, setAsientoDetalle] = useState(null);
    const [diagnostico, setDiagnostico] = useState(null);
    const [asientoForm, setAsientoForm] = useState({
        referencia: '',
        origen: 'manual',
        lineas: [emptyLinea(), emptyLinea()],
    });

    const filtrosApi = {
        fechaDesde: filtros.fechaDesde,
        fechaHasta: filtros.fechaHasta,
        sucursalId: filtros.sucursalId || undefined,
    };

    const loadCuentas = async () => {
        setCuentas(await contabService.getCuentas());
    };

    const loadAsientos = async () => {
        const res = await contabService.getAsientos({ ...filtrosApi, perPage: 100 });
        setAsientos(res.data || []);
        try {
            setDiagnostico(await contabService.getDiagnostico(filtrosApi));
        } catch {
            setDiagnostico(null);
        }
    };

    const loadBalance = async () => {
        setBalance(await contabService.getBalanceGeneral(filtrosApi));
    };

    const loadResultados = async () => {
        setResultados(await contabService.getEstadoResultados(filtrosApi));
    };

    const loadSegment = async () => {
        setLoading(true);
        try {
            if (segment === 'cuentas') await loadCuentas();
            if (segment === 'asientos') {
                await Promise.all([loadCuentas(), loadAsientos()]);
            }
            if (segment === 'balance') await loadBalance();
            if (segment === 'resultados') await loadResultados();
        } catch (e) {
            Swal.fire('Error', e.message || 'No se pudo cargar', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSegment();
    }, [segment, filtros.fechaDesde, filtros.fechaHasta, filtros.sucursalId]);

    const handleSaveCuenta = async () => {
        if (!cuentaForm.codigo.trim() || !cuentaForm.nombre.trim()) {
            Swal.fire('Validación', 'Código y nombre son obligatorios', 'warning');
            return;
        }
        try {
            await contabService.createCuenta({
                codigo: cuentaForm.codigo.trim(),
                nombre: cuentaForm.nombre.trim(),
                tipo: cuentaForm.tipo,
            });
            setShowCuentaModal(false);
            setCuentaForm({ codigo: '', nombre: '', tipo: 'Activo' });
            await loadCuentas();
            Swal.fire({ icon: 'success', title: 'Cuenta creada', timer: 1500, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    const totalesAsiento = useMemo(() => {
        let debe = 0;
        let haber = 0;
        asientoForm.lineas.forEach((l) => {
            debe += Number(l.debe) || 0;
            haber += Number(l.haber) || 0;
        });
        return { debe, haber, cuadra: Math.abs(debe - haber) < 0.01 };
    }, [asientoForm.lineas]);

    const handleSaveAsiento = async () => {
        const detalles = asientoForm.lineas
            .map((l) => ({
                cuentaId: Number(l.cuentaId),
                debe: Number(l.debe) || 0,
                haber: Number(l.haber) || 0,
            }))
            .filter((l) => l.cuentaId > 0 && (l.debe > 0 || l.haber > 0));

        if (detalles.length < 2) {
            Swal.fire('Validación', 'Agrega al menos dos líneas con cuenta y monto', 'warning');
            return;
        }
        if (!totalesAsiento.cuadra) {
            Swal.fire('Validación', 'El debe debe igualar al haber', 'warning');
            return;
        }

        try {
            await contabService.createAsiento({
                referencia: asientoForm.referencia || 'Asiento manual',
                origen: asientoForm.origen || 'manual',
                sucursalId: Number(filtros.sucursalId) || 1,
                detalles,
            });
            setShowAsientoModal(false);
            setAsientoForm({ referencia: '', origen: 'manual', lineas: [emptyLinea(), emptyLinea()] });
            await loadAsientos();
            if (segment === 'balance') await loadBalance();
            if (segment === 'resultados') await loadResultados();
            Swal.fire({ icon: 'success', title: 'Asiento registrado', timer: 1500, showConfirmButton: false });
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    const verAsiento = async (id) => {
        try {
            setAsientoDetalle(await contabService.getAsiento(id));
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    const renderFiltros = () => {
        const hintBalance =
            'Balance: la fecha «Hasta» es la fecha de corte (saldos acumulados). «Desde» no altera el balance.';
        const hintResultados =
            'Estado de resultados: use «Desde» y «Hasta» para definir el período del reporte.';
        const hintAsientos = 'Libro diario: lista asientos entre las fechas indicadas.';

        return (
            <div className="mb-5 rounded-xl border border-[#e2e8f0] bg-white p-4">
                <p className="mb-3 flex items-start gap-2 text-[13px] leading-snug text-[#64748b]">
                    <FiInfo size={14} />
                    {segment === 'balance' && hintBalance}
                    {segment === 'resultados' && hintResultados}
                    {segment === 'asientos' && hintAsientos}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                    <div className={`${FORM_GROUP} !mb-0 min-w-[140px]`}>
                        <label>{segment === 'balance' ? 'Período (desde)' : 'Desde'}</label>
                        <input
                            type="date"
                            value={filtros.fechaDesde}
                            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                        />
                    </div>
                    <div className={`${FORM_GROUP} !mb-0 min-w-[140px]`}>
                        <label>{segment === 'balance' ? 'Corte (hasta) *' : 'Hasta'}</label>
                        <input
                            type="date"
                            value={filtros.fechaHasta}
                            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                        />
                    </div>
                    <div className={`${FORM_GROUP} !mb-0 min-w-[140px]`}>
                        <label>Sucursal</label>
                        <input
                            type="number"
                            min="1"
                            value={filtros.sucursalId}
                            onChange={(e) => setFiltros({ ...filtros, sucursalId: e.target.value })}
                        />
                    </div>
                    <button type="button" className={BTN_MOD_PRIMARY} onClick={loadSegment} disabled={loading}>
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>
        );
    };

    const renderCuentas = () => (
        <div className={PANEL}>
            <div className="mb-4 flex justify-between">
                <h3 className="m-0 font-display text-base text-text">Plan de cuentas</h3>
                <button type="button" className={BTN_ADD} onClick={() => setShowCuentaModal(true)}>
                    <FiPlus /> Nueva cuenta
                </button>
            </div>
            <table className={TABLE}>
                <thead>
                    <tr>
                        <th className={TH}>Código</th>
                        <th className={TH}>Nombre</th>
                        <th className={TH}>Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    {cuentas.map((c) => (
                        <tr key={c.id}>
                            <td className={TD}><strong>{c.codigo}</strong></td>
                            <td className={TD}>{c.nombre}</td>
                            <td className={TD}><span className={BADGE_RES}>{c.tipo}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderAsientos = () => (
        <div className={PANEL}>
            <div className="mb-4 flex justify-between">
                <h3 className="m-0 font-display text-base text-text">Libro diario</h3>
                <button type="button" className={BTN_ADD} onClick={() => setShowAsientoModal(true)}>
                    <FiPlus /> Asiento manual
                </button>
            </div>
            {diagnostico && (
                <p className={`mb-3 rounded-lg px-3 py-2 text-[13px] ${diagnostico.cuadra ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                    Libro en período: Debe ${Number(diagnostico.totalDebe).toFixed(2)} · Haber $
                    {Number(diagnostico.totalHaber).toFixed(2)}
                    {diagnostico.cuadra ? ' · Cuadra' : ` · Diferencia $${Number(diagnostico.diferencia).toFixed(2)}`}
                </p>
            )}
            <table className={TABLE}>
                <thead>
                    <tr>
                        <th className={TH}>Fecha</th>
                        <th className={TH}>Origen</th>
                        <th className={TH}>Referencia</th>
                        <th className={TH}>Debe</th>
                        <th className={TH}>Haber</th>
                        <th className={TH} />
                    </tr>
                </thead>
                <tbody>
                    {asientos.length === 0 && (
                        <tr>
                            <td colSpan={6} className={`${TD} py-6 text-center text-muted`}>
                                No hay asientos en el período. Las ventas y abonos generan asientos automáticos.
                            </td>
                        </tr>
                    )}
                    {asientos.map((a) => (
                        <tr key={a.id}>
                            <td className={TD}>{String(a.fecha || '').replace('T', ' ').slice(0, 16)}</td>
                            <td className={TD}><span className={BADGE_RES}>{a.origen}</span></td>
                            <td className={TD}>{a.referencia}</td>
                            <td className={TD}>${a.totalDebe.toFixed(2)}</td>
                            <td className={TD}>${a.totalHaber.toFixed(2)}</td>
                            <td className={TD}>
                                <button type="button" className={BTN_TABLE} title="Ver detalle" onClick={() => verAsiento(a.id)}>
                                    <FiEye />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderBalance = () => {
        if (!balance) return <p className="text-muted">Cargando balance...</p>;
        const t = balance.totales || {};

        return (
            <div className={PANEL}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="m-0 font-display text-base text-text">Balance general</h3>
                        {balance.fechaCorte && (
                            <p className="mt-1 text-[13px] text-muted">Corte al {balance.fechaCorte}</p>
                        )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${t.cuadra ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                        {t.cuadra ? <><FiCheck /> Activo = Pasivo + Patrimonio</> : <>Diferencia: ${Number(t.diferencia).toFixed(2)}</>}
                    </span>
                </div>
                {balance.nota && <p className="mb-4 rounded-lg border-l-[3px] border-[#3b82f6] bg-[#f8fafc] px-3 py-2.5 text-[13px] text-[#64748b]">{balance.nota}</p>}
                {(balance.secciones || []).map((sec) => (
                    <div key={sec.tipo}>
                        <p className={SEG_TITULO}>{sec.tipo}</p>
                        <table className={TABLE}>
                            <thead>
                                <tr>
                                    <th className={TH}>Código</th>
                                    <th className={TH}>Cuenta</th>
                                    <th className={`${TH} text-right`}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sec.cuentas || []).map((c, idx) => (
                                    <tr key={c.cuentaId ?? `calc-${idx}`} className={c.esCalculado ? '[&>td]:italic [&>td]:text-[#0369a1]' : ''}>
                                        <td className={TD}>{c.codigo}</td>
                                        <td className={TD}>{c.nombre}</td>
                                        <td className={`${TD} text-right font-bold`}>${Number(c.saldo).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={`${TOTAL_BASE} ${sec.tipo === 'Activo' ? TOTAL_VARIANT.activo : TOTAL_VARIANT.pasivo}`}>
                            <span>Subtotal {sec.tipo}</span>
                            <span>${Number(sec.subtotal).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div className={`${TOTAL_BASE} ${TOTAL_VARIANT.activo} mt-5`}>
                    <span>Total activo</span>
                    <span>${Number(t.activo).toFixed(2)}</span>
                </div>
                <div className={`${TOTAL_BASE} ${TOTAL_VARIANT.pasivo}`}>
                    <span>Total pasivo + patrimonio</span>
                    <span>${Number(t.pasivoPatrimonio).toFixed(2)}</span>
                </div>
            </div>
        );
    };

    const renderResultados = () => {
        if (!resultados) return <p className="text-muted">Cargando estado de resultados...</p>;
        const tot = resultados.totales || {};

        const tablaSeccion = (titulo, filas) => (
            <>
                <p className={SEG_TITULO}>{titulo}</p>
                <table className={TABLE}>
                    <thead>
                        <tr>
                            <th className={TH}>Código</th>
                            <th className={TH}>Cuenta</th>
                            <th className={`${TH} text-right`}>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(filas || []).length === 0 && (
                            <tr>
                                <td colSpan={3} className={`${TD} text-muted`}>Sin movimientos</td>
                            </tr>
                        )}
                        {(filas || []).map((c) => (
                            <tr key={c.cuentaId}>
                                <td className={TD}>{c.codigo}</td>
                                <td className={TD}>{c.nombre}</td>
                                <td className={`${TD} text-right`}>${Number(c.saldo).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>
        );

        return (
            <div className={PANEL}>
                <h3 className="mt-0 font-display text-base text-text">Estado de resultados</h3>
                {resultados.nota && <p className="mb-4 rounded-lg border-l-[3px] border-[#3b82f6] bg-[#f8fafc] px-3 py-2.5 text-[13px] text-[#64748b]">{resultados.nota}</p>}
                {resultados.fechaDesde && (
                    <p className="text-[13px] text-muted">
                        Período: {resultados.fechaDesde} al {resultados.fechaHasta}
                    </p>
                )}
                {tablaSeccion('Ingresos', resultados.ingresos)}
                <div className={`${TOTAL_BASE} ${TOTAL_VARIANT.activo}`}>
                    <span>Total ingresos</span>
                    <span>${Number(tot.ingresos).toFixed(2)}</span>
                </div>
                {tablaSeccion('Egresos', resultados.egresos)}
                <div className={`${TOTAL_BASE} ${TOTAL_VARIANT.pasivo}`}>
                    <span>Total egresos</span>
                    <span>${Number(tot.egresos).toFixed(2)}</span>
                </div>
                <div className={`${TOTAL_BASE} ${Number(tot.utilidadNeta) < 0 ? TOTAL_VARIANT.negativa : TOTAL_VARIANT.utilidad}`}>
                    <span>Utilidad neta del período</span>
                    <span>${Number(tot.utilidadNeta).toFixed(2)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="relative p-2.5">
            {loading && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/60">
                    <FiRefreshCw className="animate-spin text-3xl text-accent" />
                </div>
            )}

            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-[28px] text-text">Contabilidad</h1>
                    <p className="mt-1 text-sm text-muted">Plan de cuentas, libro diario, balance general y estado de resultados</p>
                </div>
            </div>

            <ContabilidadGuia open={showGuia} onToggle={() => setShowGuia((v) => !v)} />

            <div className="mb-5 flex flex-wrap gap-2" role="tablist">
                {SEGMENTS.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={segment === s.id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold transition ${
                            segment === s.id
                                ? 'border-accent bg-accent/[0.08] text-accent'
                                : 'border-[#e2e8f0] bg-white text-[#64748b]'
                        }`}
                        onClick={() => setSegment(s.id)}
                    >
                        <s.icon /> {s.label}
                    </button>
                ))}
            </div>

            {segment !== 'cuentas' && renderFiltros()}

            {segment === 'cuentas' && renderCuentas()}
            {segment === 'asientos' && renderAsientos()}
            {segment === 'balance' && renderBalance()}
            {segment === 'resultados' && renderResultados()}

            <ModFormModal
                open={Boolean(asientoDetalle)}
                onClose={() => setAsientoDetalle(null)}
                title="Detalle del asiento"
                wide
                footer={
                    <button type="button" className={BTN_MOD} onClick={() => setAsientoDetalle(null)}>
                        Cerrar
                    </button>
                }
            >
                {asientoDetalle && (
                    <>
                        <p className="mb-3 text-muted">
                            {asientoDetalle.origen} · {asientoDetalle.referencia} ·{' '}
                            {String(asientoDetalle.fecha || '').slice(0, 16)}
                        </p>
                        <table className={TABLE}>
                            <thead>
                                <tr>
                                    <th className={TH}>Cuenta</th>
                                    <th className={`${TH} text-right`}>Debe</th>
                                    <th className={`${TH} text-right`}>Haber</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(asientoDetalle.detalles || []).map((d) => (
                                    <tr key={d.id}>
                                        <td className={TD}>{d.cuentaCodigo} — {d.cuentaNombre}</td>
                                        <td className={`${TD} text-right`}>{d.debe > 0 ? `$${d.debe.toFixed(2)}` : '—'}</td>
                                        <td className={`${TD} text-right`}>{d.haber > 0 ? `$${d.haber.toFixed(2)}` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold">
                                    <td className={TD}>Totales</td>
                                    <td className={`${TD} text-right`}>${asientoDetalle.totalDebe.toFixed(2)}</td>
                                    <td className={`${TD} text-right`}>${asientoDetalle.totalHaber.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </>
                )}
            </ModFormModal>

            <ModFormModal
                open={showCuentaModal}
                onClose={() => setShowCuentaModal(false)}
                title="Nueva cuenta contable"
                footer={
                    <>
                        <button type="button" className={BTN_MOD} onClick={() => setShowCuentaModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={handleSaveCuenta}>
                            <FiCheck /> Guardar
                        </button>
                    </>
                }
            >
                <div className={FORM_GROUP}>
                    <label>Código</label>
                    <input
                        value={cuentaForm.codigo}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, codigo: e.target.value })}
                        placeholder="Ej. 1.1.05"
                    />
                </div>
                <div className={FORM_GROUP}>
                    <label>Nombre</label>
                    <input
                        value={cuentaForm.nombre}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
                    />
                </div>
                <div className={FORM_GROUP}>
                    <label>Tipo</label>
                    <select
                        value={cuentaForm.tipo}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}
                    >
                        {contabService.TIPOS_CUENTA.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </ModFormModal>

            <ModFormModal
                open={showAsientoModal}
                onClose={() => setShowAsientoModal(false)}
                title="Asiento manual"
                wide
                footer={
                    <>
                        <button type="button" className={BTN_MOD} onClick={() => setShowAsientoModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className={BTN_MOD_PRIMARY} onClick={handleSaveAsiento}>
                            <FiCheck /> Registrar asiento
                        </button>
                    </>
                }
            >
                <div className={FORM_ROW}>
                    <div className={FORM_GROUP}>
                        <label>Referencia</label>
                        <input
                            value={asientoForm.referencia}
                            onChange={(e) => setAsientoForm({ ...asientoForm, referencia: e.target.value })}
                            placeholder="Descripción del asiento"
                        />
                    </div>
                </div>
                <p className={FORM_HINT}>
                    Debe: ${totalesAsiento.debe.toFixed(2)} — Haber: ${totalesAsiento.haber.toFixed(2)}
                    {!totalesAsiento.cuadra && ' (no cuadra)'}
                </p>
                <div className="my-3 flex flex-col gap-2.5">
                    {asientoForm.lineas.map((linea, idx) => (
                        <div className="grid grid-cols-[1fr_100px_100px_40px] items-end gap-2.5 max-[768px]:grid-cols-1" key={idx}>
                            <div className={`${FORM_GROUP} !mb-0`}>
                                <label>Cuenta</label>
                                <select
                                    value={linea.cuentaId}
                                    onChange={(e) => {
                                        const lineas = [...asientoForm.lineas];
                                        lineas[idx] = { ...lineas[idx], cuentaId: e.target.value };
                                        setAsientoForm({ ...asientoForm, lineas });
                                    }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {cuentas.map((c) => (
                                        <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={`${FORM_GROUP} !mb-0`}>
                                <label>Debe</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={linea.debe}
                                    onChange={(e) => {
                                        const lineas = [...asientoForm.lineas];
                                        lineas[idx] = { ...lineas[idx], debe: e.target.value, haber: '' };
                                        setAsientoForm({ ...asientoForm, lineas });
                                    }}
                                />
                            </div>
                            <div className={`${FORM_GROUP} !mb-0`}>
                                <label>Haber</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={linea.haber}
                                    onChange={(e) => {
                                        const lineas = [...asientoForm.lineas];
                                        lineas[idx] = { ...lineas[idx], haber: e.target.value, debe: '' };
                                        setAsientoForm({ ...asientoForm, lineas });
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                className={BTN_TABLE_DEL}
                                title="Quitar línea"
                                disabled={asientoForm.lineas.length <= 2}
                                onClick={() => {
                                    const lineas = asientoForm.lineas.filter((_, i) => i !== idx);
                                    setAsientoForm({ ...asientoForm, lineas });
                                }}
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className={BTN_MOD}
                    onClick={() =>
                        setAsientoForm({
                            ...asientoForm,
                            lineas: [...asientoForm.lineas, emptyLinea()],
                        })
                    }
                >
                    <FiPlus /> Agregar línea
                </button>
            </ModFormModal>
        </div>
    );
}
