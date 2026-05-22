import { FiCheck, FiCreditCard } from 'react-icons/fi';
import { creditoDisponible, puedeVenderCredito } from '../services/clientes.service';

function formatVencimiento(diasCredito) {
    const dias = Number(diasCredito) > 0 ? Number(diasCredito) : 30;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    try {
        return d.toLocaleDateString('es', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

/**
 * Panel de detalle para venta a crédito (paso 4 del wizard).
 */
export default function CreditoPagoPanel({
    client,
    totalUSD,
    totalBs,
    onIrSeleccionarCliente,
}) {
    if (!client) {
        return (
            <div className="ventas-credito-panel">
                <div className="ventas-credito-alert ventas-credito-alert--warn">
                    <p>No hay cliente seleccionado. Vuelve al paso anterior y elige un cliente registrado.</p>
                    <button type="button" className="btn-wizard btn-wizard-back" onClick={onIrSeleccionarCliente}>
                        Ir a selección de cliente
                    </button>
                </div>
            </div>
        );
    }

    const monto = Number(totalUSD) || 0;
    const check = puedeVenderCredito(client, monto);
    const saldo = Number(client.saldo ?? 0);
    const limite = Number(client.limiteCredito ?? 0);
    const disponible = Number(client.creditoDisponible ?? creditoDisponible(client));
    const plazo = Number(client.diasCredito) > 0 ? Number(client.diasCredito) : 30;

    return (
        <div className="ventas-credito-panel">
            <div className={`ventas-credito-header ${check.ok ? 'is-ok' : 'is-error'}`}>
                <div className="ventas-credito-header-icon">
                    <FiCreditCard />
                </div>
                <div>
                    <p className="ventas-credito-header-label">Venta a crédito</p>
                    <p className="ventas-credito-header-sub">
                        {client.name || 'Cliente'} · {client.cedula || '—'}
                    </p>
                </div>
                <div className="ventas-credito-header-total">
                    <span>Monto a financiar</span>
                    <strong>${monto.toFixed(2)}</strong>
                    <small>Bs. {Number(totalBs || 0).toFixed(2)} (referencia)</small>
                </div>
            </div>

            <div className="ventas-credito-grid">
                <div className="ventas-credito-stat">
                    <span>Límite de crédito</span>
                    <strong>${limite.toFixed(2)}</strong>
                </div>
                <div className="ventas-credito-stat">
                    <span>Saldo actual</span>
                    <strong style={{ color: saldo > 0 ? '#dc2626' : '#15803d' }}>
                        ${saldo.toFixed(2)}
                    </strong>
                </div>
                <div className="ventas-credito-stat">
                    <span>Crédito disponible</span>
                    <strong>${disponible.toFixed(2)}</strong>
                </div>
                <div className="ventas-credito-stat">
                    <span>Plazo</span>
                    <strong>{plazo} días</strong>
                </div>
            </div>

            <div className="ventas-credito-resumen">
                <div className="ventas-credito-resumen-row">
                    <span>Total de esta venta</span>
                    <span>${monto.toFixed(2)}</span>
                </div>
                <div className="ventas-credito-resumen-row">
                    <span>Saldo después de la venta</span>
                    <span>${(saldo + monto).toFixed(2)}</span>
                </div>
                <div className="ventas-credito-resumen-row ventas-credito-resumen-row--muted">
                    <span>Vencimiento estimado</span>
                    <span>{formatVencimiento(client.diasCredito)}</span>
                </div>
            </div>

            {check.ok ? (
                <div className="ventas-credito-alert ventas-credito-alert--ok">
                    <FiCheck style={{ flexShrink: 0 }} />
                    <p>
                        El cliente tiene crédito suficiente. Al confirmar se registrará la factura y se
                        aumentará su saldo pendiente.
                    </p>
                </div>
            ) : (
                <div className="ventas-credito-alert ventas-credito-alert--error">
                    <p>
                        <strong>No se puede completar a crédito:</strong> {check.reason}
                    </p>
                    <p className="ventas-credito-hint">
                        En Clientes, asigna límite y días de crédito, o elige otro método de pago.
                    </p>
                </div>
            )}
        </div>
    );
}
