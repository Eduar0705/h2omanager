import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathForRole } from './auth.service';

export default function ProtectedRoute({ children, role }) {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                }}
            >
                Verificando sesión…
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // Control de acceso por rol: si la ruta exige un rol y el usuario tiene otro,
    // se le redirige a su propio inicio en vez de mostrarle un área que no le corresponde.
    if (role != null && Number(user?.role) !== Number(role)) {
        return <Navigate to={homePathForRole(user?.role)} replace />;
    }

    return children;
}
