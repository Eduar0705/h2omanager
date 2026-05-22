/**
 * Servicios de Rutas de Entrega - H2OManager
 */

const KEY = 'h2o_rutas';

const request = async (method = 'GET', body = null) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (method === 'GET') {
        const data = localStorage.getItem(KEY);
        return data ? JSON.parse(data) : [];
    } else {
        localStorage.setItem(KEY, JSON.stringify(body));
        return true;
    }
};

export const getRutas = async () => await request('GET');
export const saveRutas = async (data) => await request('POST', data);

export const addRuta = async (ruta) => {
    const all = await getRutas();
    const newItem = {
        id: Date.now(),
        status: 'active',
        createdAt: new Date().toISOString(),
        ...ruta
    };
    await saveRutas([...all, newItem]);
    return newItem;
};

export const updateRuta = async (id, data) => {
    const all = await getRutas();
    return await saveRutas(all.map(r => r.id === id ? { ...r, ...data } : r));
};

export const deleteRuta = async (id) => {
    const all = await getRutas();
    return await saveRutas(all.filter(r => r.id !== id));
};