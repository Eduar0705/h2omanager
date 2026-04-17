/**
 * Empleados — misma API que usuarios del sistema (/api/v1/usuario).
 */

export {
    getUsuarios as getEmpleados,
    createUsuario as addEmpleado,
    updateUsuario as updateEmpleado,
    deleteUsuario as deleteEmpleado,
    getSucursales,
    ROL_OPCIONES,
} from './usuarios.service';
