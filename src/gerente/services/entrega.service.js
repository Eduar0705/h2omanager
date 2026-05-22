/**
 * Servicios de Entregas - H2OManager
 * Implementación asíncrona con fallback en LocalStorage
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const USE_API = false;
const KEY = 'h2o_entregas';

const request = async (method = 'GET', body = null) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (USE_API && BASE_URL) { /* API real */ }
    if (method === 'GET') {
        const data = localStorage.getItem(KEY);
        return data ? JSON.parse(data) : [];
    } else {
        localStorage.setItem(KEY, JSON.stringify(body));
        return true;
    }
};

export const getEntregas = async () => await request('GET');
export const saveEntregas = async (data) => await request('POST', data);

export const addEntrega = async (entrega) => {
    const all = await getEntregas();
    const newItem = {
        id: `ENT-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        status: 'pendiente',
        ...entrega
    };
    await saveEntregas([newItem, ...all]);
    return newItem;
};

export const updateEntrega = async (id, data) => {
    const all = await getEntregas();
    const updated = all.map(e => e.id === id ? { ...e, ...data } : e);
    return await saveEntregas(updated);
};

export const deleteEntrega = async (id) => {
    const all = await getEntregas();
    return await saveEntregas(all.filter(e => e.id !== id));
};