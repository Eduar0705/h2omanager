// El historial es solo consulta de documentos de venta y no tiene acciones
// exclusivas de gerente, por lo que el vendedor usa la misma vista.
import Historial from "../gerente/historial.jsx";

export default function HistorialEmpleado() {
  return <Historial />;
}
