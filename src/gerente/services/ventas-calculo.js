/**
 * Cálculo de subtotal, IVA y total para ventas.
 * El % de IVA proviene de Configuración → Moneda (localStorage h2o_config_currency).
 */

export function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

/**
 * @param {{ qty?: number, price?: number, gravaIva?: boolean }} item
 * @param {number} ivaPorcentaje — ej. 16 para 16%
 */
export function calcularLinea(item, ivaPorcentaje = 0) {
    const qty = Number(item.qty ?? item.cantidad ?? 0);
    const price = Number(item.price ?? item.precioUnitario ?? 0);
    const gravaIva = item.gravaIva !== false;
    const base = roundMoney(qty * price);
    const ivaMonto =
        gravaIva && ivaPorcentaje > 0 ? roundMoney(base * (ivaPorcentaje / 100)) : 0;
    const totalLinea = roundMoney(base + ivaMonto);

    return { qty, price, gravaIva, base, ivaMonto, totalLinea };
}

/**
 * @param {Array<object>} items — líneas del carrito
 * @param {number} ivaPorcentaje
 */
export function calcularTotalesCarrito(items = [], ivaPorcentaje = 0) {
    let subtotal = 0;
    let iva = 0;

    for (const item of items) {
        const line = calcularLinea(item, ivaPorcentaje);
        subtotal += line.base;
        iva += line.ivaMonto;
    }

    subtotal = roundMoney(subtotal);
    iva = roundMoney(iva);

    return {
        subtotal,
        iva,
        total: roundMoney(subtotal + iva),
        ivaPorcentaje: Number(ivaPorcentaje) || 0,
    };
}

/**
 * Prepara ítems del carrito con montos de IVA para enviar a la API.
 */
export function itemsConIvaParaApi(items = [], ivaPorcentaje = 0) {
    return items.map((item) => {
        const line = calcularLinea(item, ivaPorcentaje);
        return {
            ...item,
            ivaMonto: line.ivaMonto,
            totalLineas: line.totalLinea,
            subtotalLinea: line.base,
        };
    });
}
