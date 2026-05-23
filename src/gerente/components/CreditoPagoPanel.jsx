import { FiCheck, FiCreditCard } from 'react-icons/fi';
import { creditoDisponible, puedeVenderCredito } from '../services/clientes.service';

const PANEL = 'mt-6 overflow-hidden rounded-[14px] border border-[#e2e8f0] bg-white';
const STAT = 'flex flex-col gap-1';
const STAT_LABEL = 'text-[11px] font-semibold uppercase tracking-[0.03em] text-[#94a3b8]';

function formatVencimiento(diasCredito) {
    const dias = Number(diasCredito) > 0 ? Number(diasCredito) : 30;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    try {
        return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

export default function CreditoPagoPanel({ client, totalUSD, totalBs, onIrSeleccionarCliente }) {
    if (!client) {
        return (
            <div className={PANEL}>
                <div className="m-6 flex flex-col items-start gap-3 rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3.5 text-[13px] leading-normal text-[#9a3412]">
                    <p>No hay cliente seleccionado. Vuelve al paso anterior y elige un cliente registrado.</p>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl bg-[#f1f5f9] px-6 py-3 text-sm font-semibold text-text transition hover:bg-[#e2e8f0]"
                        onClick={onIrSeleccionarCliente}
                    >
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
        <div className={PANEL}>
            <div className={`flex flex-wrap items-center gap-4 px-6 py-5 ${check.ok ? 'border-b border-[#bfdbfe] bg-gradient-to-br from-[#eff6ff] to-[#e0f2fe]' : 'border-b border-[#fecaca] bg-gradient-to-br from-[#fef2f2] to-[#fff7ed]'}`}>
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-[22px] text-white ${check.ok ? 'bg-[#2563eb]' : 'bg-[#dc2626]'}`}>
                    <FiCreditCard />
                </div>
                <div>
                    <p className="font-bold text-[15px] text-[#1e293b]">Venta a crédito</p>
                    <p className="mt-1 text-[13px] text-[#64748b]">{client.name || 'Cliente'} · {client.cedula || '—'}</p>
                </div>
                <div className="ml-auto text-right">
                    <span className="block text-xs text-[#64748b]">Monto a financiar</span>
                    <strong className="block text-[28px] font-extrabold leading-tight text-[#1e293b]">${monto.toFixed(2)}</strong>
                    <small className="text-[11px] text-[#94a3b8]">Bs. {Number(totalBs || 0).toFixed(2)} (referencia)</small>
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 border-b border-[#f1f5f9] bg-[#f8fafc] px-6 py-4">
                <div className={STAT}>
                    <span className={STAT_LABEL}>Límite de crédito</span>
                    <strong className="text-base text-[#1e293b]">${limite.toFixed(2)}</strong>
                </div>
                <div className={STAT}>
                    <span className={STAT_LABEL}>Saldo actual</span>
                    <strong className="text-base" style={{ color: saldo > 0 ? '#dc2626' : '#15803d' }}>${saldo.toFixed(2)}</strong>
                </div>
                <div className={STAT}>
                    <span className={STAT_LABEL}>Crédito disponible</span>
                    <strong className="text-base text-[#1e293b]">${disponible.toFixed(2)}</strong>
                </div>
                <div className={STAT}>
                    <span className={STAT_LABEL}>Plazo</span>
                    <strong className="text-base text-[#1e293b]">{plazo} días</strong>
                </div>
            </div>

            <div className="flex flex-col gap-2 px-6 py-3.5">
                <div className="flex justify-between text-sm font-semibold text-[#334155]">
                    <span>Total de esta venta</span>
                    <span>${monto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#334155]">
                    <span>Saldo después de la venta</span>
                    <span>${(saldo + monto).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#e2e8f0] pt-2 text-[13px] font-medium text-[#64748b]">
                    <span>Vencimiento estimado</span>
                    <span>{formatVencimiento(client.diasCredito)}</span>
                </div>
            </div>

            {check.ok ? (
                <div className="mx-6 mb-5 flex items-start gap-2.5 rounded-[10px] border border-[#86efac] bg-[#dcfce7] px-4 py-3.5 text-[13px] leading-normal text-[#166534]">
                    <FiCheck className="flex-shrink-0" />
                    <p>El cliente tiene crédito suficiente. Al confirmar se registrará la factura y se aumentará su saldo pendiente.</p>
                </div>
            ) : (
                <div className="mx-6 mb-5 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3.5 text-[13px] leading-normal text-[#991b1b]">
                    <p><strong>No se puede completar a crédito:</strong> {check.reason}</p>
                    <p className="mt-2 text-xs font-medium text-[#b45309]">En Clientes, asigna límite y días de crédito, o elige otro método de pago.</p>
                </div>
            )}
        </div>
    );
}
