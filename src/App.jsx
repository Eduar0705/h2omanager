import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './index.jsx';
import Login from './auth/login.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

// Layout de gerente
import GerenteLayout from './gerente/GerenteLayout.jsx';

// Perfil (compartido por todos los roles)
import Perfil from './components/Perfil.jsx';

// Páginas de gerente
import HomeGere from './gerente/home.jsx';
import Botellones from './gerente/botellones.jsx';
import Clientes from './gerente/clientes.jsx';
import Configuracion from './gerente/configuracion.jsx';
import VentasWizard from './gerente/ventas.jsx';
import Historial from './gerente/historial.jsx';
import Reportes from './gerente/reportes.jsx';
import Proveedores from './gerente/provedores.jsx';
import Empleados from './gerente/empleados.jsx';
import Contabilidad from './gerente/contabilidad.jsx';

// Layout y páginas de empleado (vendedor)
import EmpleadoLayout from './empleado/EmpleadoLayout.jsx';
import HomeEmp from './empleado/home.jsx';
import VentasEmp from './empleado/ventas.jsx';
import ClientesEmp from './empleado/clientes.jsx';
import BotellonesEmp from './empleado/botellones.jsx';
import HistorialEmp from './empleado/historial.jsx';

function App() {
    return (
        <AuthProvider>
        <BrowserRouter>
            <Routes>
                {/* Ruta principal */}
                <Route path="/" element={<Index />} />
                <Route path="/index" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<Login />} />

                {/* Rutas de gerente con layout compartido */}
                <Route
                    path="/gerente"
                    element={
                        <ProtectedRoute role={1}>
                            <GerenteLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<HomeGere />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="botellones" element={<Botellones />} />
                    <Route path="ventas" element={<VentasWizard />} />
                    <Route path="configuracion" element={<Configuracion />} />
                    <Route path="historial" element={<Historial />} />
                    <Route path="reportes" element={<Reportes />} />
                    <Route path="contabilidad" element={<Contabilidad />} />
                    <Route path="proveedores" element={<Proveedores />} />
                    <Route path="empleados" element={<Empleados />} />
                    <Route path="perfil" element={<Perfil />} />
                </Route>

                {/* Rutas de empleado (vendedor) */}
                <Route
                    path="/empleado"
                    element={
                        <ProtectedRoute role={2}>
                            <EmpleadoLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<HomeEmp />} />
                    <Route path="clientes" element={<ClientesEmp />} />
                    <Route path="botellones" element={<BotellonesEmp />} />
                    <Route path="ventas" element={<VentasEmp />} />
                    <Route path="historial" element={<HistorialEmp />} />
                    <Route path="perfil" element={<Perfil />} />
                </Route>
            </Routes>
        </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
