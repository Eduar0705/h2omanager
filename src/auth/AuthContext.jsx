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
        if (!checkAuth()) {
            setLoading(false);
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

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: Boolean(user) && checkAuth(),
            login,
            logout,
        }),
        [user, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return ctx;
}
