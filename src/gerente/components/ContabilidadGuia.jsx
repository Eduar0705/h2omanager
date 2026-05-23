import { FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi';

const H4 = 'mb-1.5 mt-3 text-[13px] font-semibold text-[#1e293b]';
const OL = 'mb-2 list-decimal pl-5';
const UL = 'mb-2 list-disc pl-5';

export default function ContabilidadGuia({ open, onToggle }) {
    return (
        <div className="mb-5 overflow-hidden rounded-xl border border-[#bfdbfe] bg-[#f8fafc]">
            <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-4 py-3 text-left font-semibold text-[#0369a1]"
                onClick={onToggle}
            >
                <FiInfo />
                <span>¿Cómo usar el módulo contable?</span>
                {open ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {open && (
                <div className="px-5 pb-4 text-sm leading-relaxed text-[#475569]">
                    <h4 className={H4}>Flujo recomendado</h4>
                    <ol className={OL}>
                        <li>
                            <strong>Plan de cuentas</strong> — Revise que existan las cuentas del negocio
                            (Caja, Bancos, Cuentas por cobrar, Ingresos, etc.). Puede crear cuentas nuevas sin
                            cambiar la base de datos.
                        </li>
                        <li>
                            <strong>Operaciones diarias</strong> — Cada <em>venta</em> y cada <em>abono</em> en
                            Clientes genera un asiento automático en el libro diario.
                        </li>
                        <li>
                            <strong>Libro diario</strong> — Consulte y valide los asientos; use asientos manuales
                            para ajustes, compras o cierres.
                        </li>
                        <li>
                            <strong>Estado de resultados</strong> — Elija el período (ej. un mes). Muestra
                            ingresos y egresos con movimiento en ese rango y la utilidad neta.
                        </li>
                        <li>
                            <strong>Balance general</strong> — Use la fecha <em>Hasta</em> como fecha de corte.
                            Muestra la posición acumulada de activos, pasivos y patrimonio a esa fecha.
                        </li>
                    </ol>

                    <h4 className={H4}>Asientos automáticos</h4>
                    <ul className={UL}>
                        <li>
                            <strong>Venta al contado</strong> — Debe: Caja o Bancos · Haber: cuenta de ingreso del
                            producto (configurada en Inventario).
                        </li>
                        <li>
                            <strong>Venta a crédito</strong> — Debe: Cuentas por cobrar · Haber: ingreso.
                        </li>
                        <li>
                            <strong>Abono de cliente</strong> — Debe: Caja/Bancos · Haber: Cuentas por cobrar.
                        </li>
                    </ul>

                    <h4 className={H4}>Cierre contable (manual)</h4>
                    <p>
                        Para llevar la utilidad a <strong>Resultados acumulados (3.1.02)</strong>, registre un
                        asiento manual de cierre: cierre ingresos y egresos contra Resultados acumulados. Hasta
                        entonces, el balance incluye una línea calculada &quot;Resultado del ejercicio&quot; para
                        que la ecuación cuadre.
                    </p>

                    <h4 className={H4}>Partida doble</h4>
                    <p>
                        Todo asiento manual debe cumplir: suma del <strong>Debe</strong> = suma del{' '}
                        <strong>Haber</strong>. Si el balance no cuadra, revise el libro diario y que todas las
                        ventas/abonos se hayan registrado.
                    </p>
                </div>
            )}
        </div>
    );
}
