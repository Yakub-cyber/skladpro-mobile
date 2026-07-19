// ──────────────────────────────────────────────────────────────────────────
//  Резерв и физическое списание остатков по заказам.
//  Модель: заказ РЕЗЕРВИРУЕТ остаток пока открыт, физическое списание
//  происходит при переходе в отгрузку. Доступно = остаток − резерв.
//
//  Раньше (до P0.1) мобилка списывала stock прямо в addOrder через
//  Math.max(0, stock-qty), а cancelOrder ничего не откатывал — учёт врал.
//  Теперь модель совпадает с веб-версией: addOrder держит резерв,
//  applyOrderStock(-1) выбывает при shipped, applyOrderStock(+1)
//  возвращает при отмене.
//
//  FIFO/партии (P0.2): для товаров с batches applyOrderStock списывает
//  через consumeFIFO и сохраняет it.consumed, чтобы отмена восстановила
//  те же партии. Товары без batches работают через legacy stock-число.
// ──────────────────────────────────────────────────────────────────────────
import {
  hasBatches,
  totalStock,
  weightedCostFromBatches,
  addBatch,
  consumeFIFO,
  reverseConsume,
} from './batches'

// Статусы, в которых заказ держит резерв (ещё не отгружен и не отменён).
export const OPEN_STATUSES = ['new', 'confirmed', 'picking', 'packed']

// Статусы, в которых остаток уже физически списан со склада.
export const CONSUMED_STATUSES = ['shipped', 'delivered']

// Флаг «остаток физически списан» из статуса — для заказов, пришедших без
// него (данные до модели резервирования: из облака или старого persist).
export function stockConsumedFromStatus(status) {
  return CONSUMED_STATUSES.includes(status)
}

// Зарезервировано по товарам: сумма кол-ва в открытых заказах → { productId: qty }.
export function reservedByProduct(orders = []) {
  const map = {}
  for (const o of orders) {
    if (!OPEN_STATUSES.includes(o.status)) continue
    // stockConsumed=true может стоять уже на packed после ручной коррекции —
    // тогда физически списано, резерв не держим.
    if (o.stockConsumed) continue
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

// Списание/возврат физического остатка и кодов маркировки.
// dir = -1 — отгрузка (списываем со склада, коды выбывают),
// dir = +1 — возврат при отмене отгруженного заказа.
// Возвращает { products, order } — order с записанными выбывшими кодами
// (чтобы отмена могла их восстановить).
export function applyOrderStock(state, order, dir) {
  const at = new Date().toISOString()
  const items = (order.items || []).map((it) => ({ ...it }))
  const products = state.products.map((p) => {
    const it = items.find((x) => x.productId === p.id)
    if (!it) return p
    const qty = Number(it.qty) || 0
    let np
    if (hasBatches(p)) {
      // FIFO-ветка.
      let batches = p.batches
      if (dir < 0) {
        // Отгрузка: списываем FIFO, записываем consumed в позицию заказа.
        const r = consumeFIFO(batches, qty)
        batches = r.batches
        it.consumed = r.consumed
      } else if (dir > 0) {
        // Отмена отгрузки: восстанавливаем прежние партии по consumed,
        // либо (если запись consumed отсутствует — старый заказ до P0.2)
        // создаём одну партию с текущей средней ценой.
        if (it.consumed?.length) {
          batches = reverseConsume(batches, it.consumed)
          it.consumed = null
        } else {
          const cost = weightedCostFromBatches(batches) || Number(p.cost) || 0
          const r = addBatch(batches, qty, cost, at)
          batches = r.batches
        }
      }
      np = {
        ...p,
        batches,
        stock: totalStock(batches),
        cost: weightedCostFromBatches(batches) || p.cost || 0,
      }
    } else {
      // Legacy: stock как число.
      np = { ...p, stock: Math.max(0, (p.stock || 0) + dir * qty) }
    }
    if (p.marked) {
      if (dir < 0) {
        // Отгрузка: первые ceil(qty) кодов выбывают — сохраняем в позиции,
        // чтобы отмена вернула их же (без дублей).
        if (p.codes?.length) {
          const n = Math.ceil(qty)
          it.codes = p.codes.slice(0, n)
          np.codes = p.codes.slice(n)
        }
      } else if (dir > 0 && it.codes?.length) {
        // Возврат: восстанавливаем ранее выбывшие коды, снимаем с позиции.
        np.codes = [...new Set([...(p.codes || []), ...it.codes])]
      }
    }
    return np
  })
  const nextOrder = { ...order, items }
  if (dir > 0) {
    // При возврате очищаем it.codes на позициях — они уже вернулись в пул.
    nextOrder.items = items.map((it) => (it.codes?.length ? { ...it, codes: [] } : it))
  }
  return { products, order: nextOrder }
}

// Миграция persist v7 → v8: переход на модель «резерв, а не consumed».
// Раньше addOrder сразу вычитал stock и записывал коды маркировки в it.codes.
// Теперь открытый заказ лишь резервирует, списание — при отгрузке.
// Что делаем:
//  - для открытых заказов (не отгружен и не отменён): возвращаем на склад
//    остаток (его удержит резерв) и коды из it.codes (без дублей), снимаем
//    коды с позиции; ставим stockConsumed=false.
//  - для отгруженных/доставленных: ставим stockConsumed=true (уже списано).
//  - для отменённых: stockConsumed=false, они уже не влияют.
// Идемпотентна: заказы с уже проставленным stockConsumed пропускаются.
export function migrateReservationV8(state) {
  const giveBack = {} // productId → qty
  const codesBack = {} // productId → [коды]
  const orders = (state.orders || []).map((o) => {
    if (o.stockConsumed != null) return o
    if (!OPEN_STATUSES.includes(o.status)) {
      return { ...o, stockConsumed: stockConsumedFromStatus(o.status) }
    }
    const items = (o.items || []).map((it) => {
      giveBack[it.productId] = (giveBack[it.productId] || 0) + (Number(it.qty) || 0)
      if (it.codes?.length) {
        codesBack[it.productId] = (codesBack[it.productId] || []).concat(it.codes)
        return { ...it, codes: [] }
      }
      return it
    })
    return { ...o, items, stockConsumed: false }
  })
  const products = (state.products || []).map((p) => {
    const dq = giveBack[p.id]
    const dc = codesBack[p.id]
    if (!dq && !dc) return p
    const np = { ...p }
    if (dq) np.stock = (p.stock || 0) + dq
    if (dc) np.codes = [...new Set([...(p.codes || []), ...dc])]
    return np
  })
  return { ...state, orders, products }
}
