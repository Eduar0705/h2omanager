/**
 * Servicios de Servicios/Mantenimiento - H2OManager
 */

const KEY = 'h2o_servicios';

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

export const getServicios = async () => await request('GET');
export const saveServicios = async (data) => await request('POST', data);

export const addServicio = async (srv) => {
    const all = await getServicios();
    const newItem = {
        id: `SRV-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        status: 'pendiente',
        ...srv
    };
    await saveServicios([newItem, ...all]);
    return newItem;
};

export const updateServicio = async (id, data) => {
    const all = await getServicios();
    return await saveServicios(all.map(s => s.id === id ? { ...s, ...data } : s));
};

export const deleteServicio = async (id) => {
    const all = await getServicios();
    return await saveServicios(all.filter(s => s.id !== id));
};