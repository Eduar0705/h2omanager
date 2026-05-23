import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    clearAuth,
    fetchCurrentUser,
    getStoredAuth,
    isAuthenticated as checkAuth,
    login as apiLogin,
    logout as apiLogout,
} from './auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredAuth()?.user ?? null);
    const [loading, setLoading] = useState(() => checkAuth());

    useEffect(() => {
        // `loading` ya se inicializa con checkAuth(), así que si no hay sesión
        // el estado correcto (false) ya está puesto y no hace falta setState aquí.
        if (!checkAuth()) {
            return;
        }
        fetchCurrentUser()
            .then((u) => setUser(u))
            .catch(() => {
                clearAuth();
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const session = await apiLogin(email, password);
        setUser(session.user);
        return session.user;
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setUser(null);
    }, []);

    // Re-sincroniza el usuario desde /me (p.ej. tras editar el perfil) y
    // actualiza el almacenamiento local; devuelve el usuario actualizado.
    const refreshUser = useCallback(async () => {
        const fresh = await fetchCurrentUser();
        setUser(fresh);
        return fresh;
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: Boolean(user) && checkAuth(),
            login,
            logout,
            refreshUser,
        }),
        [user, loading, login, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return ctx;
}
