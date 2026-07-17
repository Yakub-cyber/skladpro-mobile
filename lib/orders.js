// ──────────────────────────────────────────────────────────────────────────
//  Резерв остатков по открытым заказам.
//  Модель: заказ РЕЗЕРВИРУЕТ остаток пока открыт; физическое списание —
//  при отгрузке (в мобильном сторе addOrder уже уменьшает stock — см. отдельная
//  задача про синхронизацию модели с вебом). Здесь только вычисление резерва.
//  Доступно к продаже = остаток − резерв.
// ──────────────────────────────────────────────────────────────────────────

// Статусы, в которых заказ держит резерв (ещё не отгружен и не отменён).
export const OPEN_STATUSES = ['new', 'confirmed', 'picking', 'packed']

// Зарезервировано по товарам: сумма кол-ва в открытых заказах → { productId: qty }.
export function reservedByProduct(orders = []) {
  const map = {}
  for (const o of orders) {
    if (!OPEN_STATUSES.includes(o.status)) continue
    for (const it of o.items || []) {
      map[it.productId] = (map[it.productId] || 0) + (Number(it.qty) || 0)
    }
  }
  return map
}

// Доступно к продаже = физический остаток − резерв.
export function availableStock(product, reservedMap = {}) {
  return (product?.stock || 0) - (reservedMap[product?.id] || 0)
}
