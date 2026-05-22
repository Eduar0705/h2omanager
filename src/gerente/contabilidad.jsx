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
import '../assets/css/contabilidad.css';
import '../assets/css/modulos.css';
import '../assets/css/clientes.css';

const SEGMENTS = [
    { id: 'cuentas', label: 'Plan de cuentas', icon: FiLayers },
    { id: 'asientos', label: 'Libro diario', icon: FiBook },
    { id: 'balance', label: 'Balance general', icon: FiClipboard },
    { id: 'resultados', label: 'Estado de resultados', icon: FiTrendingUp },
];

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
            <div className="contabilidad-filtros">
                <p className="contabilidad-filtro-hint">
                    <FiInfo size={14} />
                    {segment === 'balance' && hintBalance}
                    {segment === 'resultados' && hintResultados}
                    {segment === 'asientos' && hintAsientos}
                </p>
                <div className="contabilidad-filtros-row">
                    <div className="mod-form-group">
                        <label>{segment === 'balance' ? 'Período (desde)' : 'Desde'}</label>
                        <input
                            type="date"
                            value={filtros.fechaDesde}
                            onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>{segment === 'balance' ? 'Corte (hasta) *' : 'Hasta'}</label>
                        <input
                            type="date"
                            value={filtros.fechaHasta}
                            onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                        />
                    </div>
                    <div className="mod-form-group">
                        <label>Sucursal</label>
                        <input
                            type="number"
                            min="1"
                            value={filtros.sucursalId}
                            onChange={(e) => setFiltros({ ...filtros, sucursalId: e.target.value })}
                        />
                    </div>
                    <button type="button" className="btn-mod primary" onClick={loadSegment} disabled={loading}>
                        <FiRefreshCw className={loading ? 'spin' : ''} /> Actualizar
                    </button>
                </div>
            </div>
        );
    };

    const renderCuentas = () => (
        <div className="contabilidad-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Plan de cuentas</h3>
                <button type="button" className="btn-add-client" onClick={() => setShowCuentaModal(true)}>
                    <FiPlus /> Nueva cuenta
                </button>
            </div>
            <table className="clients-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    {cuentas.map((c) => (
                        <tr key={c.id}>
                            <td><strong>{c.codigo}</strong></td>
                            <td>{c.nombre}</td>
                            <td><span className="badge badge-res">{c.tipo}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderAsientos = () => (
        <div className="contabilidad-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Libro diario</h3>
                <button type="button" className="btn-add-client" onClick={() => setShowAsientoModal(true)}>
                    <FiPlus /> Asiento manual
                </button>
            </div>
            {diagnostico && (
                <p className={`contabilidad-diag ${diagnostico.cuadra ? 'ok' : 'warn'}`}>
                    Libro en período: Debe ${Number(diagnostico.totalDebe).toFixed(2)} · Haber $
                    {Number(diagnostico.totalHaber).toFixed(2)}
                    {diagnostico.cuadra ? ' · Cuadra' : ` · Diferencia $${Number(diagnostico.diferencia).toFixed(2)}`}
                </p>
            )}
            <table className="clients-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Origen</th>
                        <th>Referencia</th>
                        <th>Debe</th>
                        <th>Haber</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {asientos.length === 0 && (
                        <tr>
                            <td colSpan={6} className="td-muted" style={{ textAlign: 'center', padding: 24 }}>
                                No hay asientos en el período. Las ventas y abonos generan asientos automáticos.
                            </td>
                        </tr>
                    )}
                    {asientos.map((a) => (
                        <tr key={a.id}>
                            <td>{String(a.fecha || '').replace('T', ' ').slice(0, 16)}</td>
                            <td>
                                <span className="badge badge-res">{a.origen}</span>
                            </td>
                            <td>{a.referencia}</td>
                            <td>${a.totalDebe.toFixed(2)}</td>
                            <td>${a.totalHaber.toFixed(2)}</td>
                            <td>
                                <button
                                    type="button"
                                    className="btn-table-action"
                                    title="Ver detalle"
                                    onClick={() => verAsiento(a.id)}
                                >
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
        if (!balance) return <p className="td-muted">Cargando balance...</p>;
        const t = balance.totales || {};

        return (
            <div className="contabilidad-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>Balance general</h3>
                        {balance.fechaCorte && (
                            <p className="td-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                                Corte al {balance.fechaCorte}
                            </p>
                        )}
                    </div>
                    <span className={t.cuadra ? 'contabilidad-cuadra-ok' : 'contabilidad-cuadra-ok contabilidad-cuadra-warn'}>
                        {t.cuadra ? <><FiCheck /> Activo = Pasivo + Patrimonio</> : <>Diferencia: ${Number(t.diferencia).toFixed(2)}</>}
                    </span>
                </div>
                {balance.nota && <p className="contabilidad-nota-reporte">{balance.nota}</p>}
                {(balance.secciones || []).map((sec) => (
                    <div key={sec.tipo}>
                        <p className="contabilidad-seccion-titulo">{sec.tipo}</p>
                        <table className="clients-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Cuenta</th>
                                    <th className="text-right">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(sec.cuentas || []).map((c, idx) => (
                                    <tr key={c.cuentaId ?? `calc-${idx}`} className={c.esCalculado ? 'fila-calculada' : ''}>
                                        <td>{c.codigo}</td>
                                        <td>{c.nombre}</td>
                                        <td className="text-right" style={{ fontWeight: 700 }}>
                                            ${Number(c.saldo).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={`contabilidad-reporte-total ${sec.tipo === 'Activo' ? 'activo' : 'pasivo'}`}>
                            <span>Subtotal {sec.tipo}</span>
                            <span>${Number(sec.subtotal).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
                <div className="contabilidad-reporte-total activo" style={{ marginTop: 20 }}>
                    <span>Total activo</span>
                    <span>${Number(t.activo).toFixed(2)}</span>
                </div>
                <div className="contabilidad-reporte-total pasivo">
                    <span>Total pasivo + patrimonio</span>
                    <span>${Number(t.pasivoPatrimonio).toFixed(2)}</span>
                </div>
            </div>
        );
    };

    const renderResultados = () => {
        if (!resultados) return <p className="td-muted">Cargando estado de resultados...</p>;
        const tot = resultados.totales || {};

        const tablaSeccion = (titulo, filas) => (
            <>
                <p className="contabilidad-seccion-titulo">{titulo}</p>
                <table className="clients-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cuenta</th>
                            <th className="text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(filas || []).length === 0 && (
                            <tr>
                                <td colSpan={3} className="td-muted">Sin movimientos</td>
                            </tr>
                        )}
                        {(filas || []).map((c) => (
                            <tr key={c.cuentaId}>
                                <td>{c.codigo}</td>
                                <td>{c.nombre}</td>
                                <td className="text-right">${Number(c.saldo).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>
        );

        return (
            <div className="contabilidad-panel">
                <h3 style={{ marginTop: 0 }}>Estado de resultados</h3>
                {resultados.nota && <p className="contabilidad-nota-reporte">{resultados.nota}</p>}
                {resultados.fechaDesde && (
                    <p className="td-muted" style={{ fontSize: 13 }}>
                        Período: {resultados.fechaDesde} al {resultados.fechaHasta}
                    </p>
                )}
                {tablaSeccion('Ingresos', resultados.ingresos)}
                <div className="contabilidad-reporte-total activo">
                    <span>Total ingresos</span>
                    <span>${Number(tot.ingresos).toFixed(2)}</span>
                </div>
                {tablaSeccion('Egresos', resultados.egresos)}
                <div className="contabilidad-reporte-total pasivo">
                    <span>Total egresos</span>
                    <span>${Number(tot.egresos).toFixed(2)}</span>
                </div>
                <div className={`contabilidad-reporte-total utilidad ${Number(tot.utilidadNeta) < 0 ? 'negativa' : ''}`}>
                    <span>Utilidad neta del período</span>
                    <span>${Number(tot.utilidadNeta).toFixed(2)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="contabilidad-container">
            {loading && (
                <div className="loading-overlay">
                    <FiRefreshCw className="loading-spinner spin" />
                </div>
            )}

            <div className="contabilidad-header">
                <div className="title-section">
                    <h1>Contabilidad</h1>
                    <p>Plan de cuentas, libro diario, balance general y estado de resultados</p>
                </div>
            </div>

            <ContabilidadGuia open={showGuia} onToggle={() => setShowGuia((v) => !v)} />

            <div className="contabilidad-segments" role="tablist">
                {SEGMENTS.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={segment === s.id}
                        className={`contabilidad-segment-btn ${segment === s.id ? 'active' : ''}`}
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
                    <button type="button" className="btn-mod" onClick={() => setAsientoDetalle(null)}>
                        Cerrar
                    </button>
                }
            >
                {asientoDetalle && (
                    <>
                        <p className="td-muted" style={{ marginBottom: 12 }}>
                            {asientoDetalle.origen} · {asientoDetalle.referencia} ·{' '}
                            {String(asientoDetalle.fecha || '').slice(0, 16)}
                        </p>
                        <table className="clients-table">
                            <thead>
                                <tr>
                                    <th>Cuenta</th>
                                    <th className="text-right">Debe</th>
                                    <th className="text-right">Haber</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(asientoDetalle.detalles || []).map((d) => (
                                    <tr key={d.id}>
                                        <td>
                                            {d.cuentaCodigo} — {d.cuentaNombre}
                                        </td>
                                        <td className="text-right">
                                            {d.debe > 0 ? `$${d.debe.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="text-right">
                                            {d.haber > 0 ? `$${d.haber.toFixed(2)}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 700 }}>
                                    <td>Totales</td>
                                    <td className="text-right">${asientoDetalle.totalDebe.toFixed(2)}</td>
                                    <td className="text-right">${asientoDetalle.totalHaber.toFixed(2)}</td>
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
                        <button type="button" className="btn-mod" onClick={() => setShowCuentaModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn-mod primary" onClick={handleSaveCuenta}>
                            <FiCheck /> Guardar
                        </button>
                    </>
                }
            >
                <div className="mod-form-group">
                    <label>Código</label>
                    <input
                        value={cuentaForm.codigo}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, codigo: e.target.value })}
                        placeholder="Ej. 1.1.05"
                    />
                </div>
                <div className="mod-form-group">
                    <label>Nombre</label>
                    <input
                        value={cuentaForm.nombre}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value })}
                    />
                </div>
                <div className="mod-form-group">
                    <label>Tipo</label>
                    <select
                        value={cuentaForm.tipo}
                        onChange={(e) => setCuentaForm({ ...cuentaForm, tipo: e.target.value })}
                    >
                        {contabService.TIPOS_CUENTA.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
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
                        <button type="button" className="btn-mod" onClick={() => setShowAsientoModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn-mod primary" onClick={handleSaveAsiento}>
                            <FiCheck /> Registrar asiento
                        </button>
                    </>
                }
            >
                <div className="mod-form-row">
                    <div className="mod-form-group">
                        <label>Referencia</label>
                        <input
                            value={asientoForm.referencia}
                            onChange={(e) => setAsientoForm({ ...asientoForm, referencia: e.target.value })}
                            placeholder="Descripción del asiento"
                        />
                    </div>
                </div>
                <p className="mod-form-hint">
                    Debe: ${totalesAsiento.debe.toFixed(2)} — Haber: ${totalesAsiento.haber.toFixed(2)}
                    {!totalesAsiento.cuadra && ' (no cuadra)'}
                </p>
                <div className="contabilidad-asiento-lineas">
                    {asientoForm.lineas.map((linea, idx) => (
                        <div className="contabilidad-asiento-linea" key={idx}>
                            <div className="mod-form-group">
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
                                        <option key={c.id} value={c.id}>
                                            {c.codigo} — {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mod-form-group">
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
                            <div className="mod-form-group">
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
                                className="btn-table-action delete"
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
                    className="btn-mod"
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
