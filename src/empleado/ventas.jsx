// El punto de venta del vendedor usa el mismo asistente que el gerente:
// es la herramienta principal del rol y debe ofrecer el flujo de cobro completo.
// Mantener una sola implementación evita que ambas vistas se desincronicen.
import VentasWizard from "../gerente/ventas.jsx";

export default function VentasEmpleado() {
  return <VentasWizard />;
}
