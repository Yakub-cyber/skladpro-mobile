// ──────────────────────────────────────────────────────────────────────────
//  Движок проводки документов. Pure-функция, отдельный модуль ради
//  тестируемости — важен для корректности остатков склада.
//
//  applyDocToState(state, doc, dir, by) → { products, movements }
//    state — { products: [...], movements: [...] }
//    doc   — документ (типы см. POST_MV/POST_SIGN + transfer/inventory)
//    dir   — 1 провести, -1 откатить
//    by    — id сотрудника (пишется в movement.by)
//
//  Особенности:
//   - для transfer при откате перемещает товар назад по item.fromWh;
//   - для inventory при откате возвращает stock к it.prevStock;
//   - stock не уходит ниже 0 (Math.max) — даже если списание больше остатка.
// ──────────────────────────────────────────────────────────────────────────

import { uid } from './id'
import { docTypeInfo } from './constants'

// Тип движения и знак влияния на остаток при проводке (post).
export const POST_MV = {
  purchase: 'in',
  sale_return: 'return',
  writeoff: 'writeoff',
  supplier_return: 'supplier_return',
  sale: 'writeoff',
}
export const POST_SIGN = {
  purchase: 1,
  sale_return: 1,
  writeoff: -1,
  supplier_return: -1,
  sale: -1,
}

export function applyDocToState(state, doc, dir, by) {
  const at = new Date().toISOString()
  const moves = []
  let products = state.products
  const setP = (id, fn) => {
    products = products.map((p) => (p.id === id ? fn(p) : p))
  }
  const reason = dir < 0 ? `Отмена · ${doc.no}` : (doc.reason || docTypeInfo(doc.type).label)

  if (doc.type === 'transfer') {
    for (const it of doc.items) {
      const to = dir > 0 ? doc.toWarehouseId : it.fromWh
      setP(it.productId, (p) => ({ ...p, warehouseId: to || p.warehouseId }))
      moves.push({
        id: uid('mv'), type: 'transfer', productId: it.productId,
        name: it.name, qty: it.qty, delta: 0, reason, by, at,
      })
    }
  } else if (doc.type === 'inventory') {
    for (const it of doc.items) {
      const target = dir > 0 ? it.qty : it.prevStock
      let delta = 0
      setP(it.productId, (p) => {
        delta = target - p.stock
        return { ...p, stock: Math.max(0, target) }
      })
      if (delta !== 0) {
        moves.push({
          id: uid('mv'), type: 'inventory', productId: it.productId,
          name: it.name, qty: Math.abs(delta), delta,
          reason: dir < 0 ? reason : (delta > 0 ? 'Излишек' : 'Недостача'),
          by, at,
        })
      }
    }
  } else {
    const sign = (POST_SIGN[doc.type] ?? -1) * dir
    const mvType = POST_MV[doc.type] || 'writeoff'
    for (const it of doc.items) {
      const d = sign * it.qty
      setP(it.productId, (p) => ({ ...p, stock: Math.max(0, p.stock + d) }))
      moves.push({
        id: uid('mv'), type: mvType, productId: it.productId,
        name: it.name, qty: it.qty, delta: d, reason, by, at,
      })
    }
  }
  return { products, movements: [...moves, ...state.movements] }
}
