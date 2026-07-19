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
import {
  hasBatches,
  totalStock,
  weightedCostFromBatches,
  addBatch,
  consumeFIFO,
  reverseConsume,
} from './batches'

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
    // purchase/sale/sale_return/writeoff/supplier_return.
    // FIFO-ветка для товаров с batches: purchase создаёт партию, расход
    // (sale/writeoff/supplier_return) списывает по FIFO с точной COGS.
    // sale_return — приход обратно, добавляем партию с текущей средней
    // себестоимостью, чтобы возврат не занижал остаток по стоимости.
    // Legacy-ветка (stock как число) сохраняется для товаров без batches.
    const sign = (POST_SIGN[doc.type] ?? -1) * dir
    const mvType = POST_MV[doc.type] || 'writeoff'
    for (const it of doc.items) {
      const qty = Number(it.qty) || 0
      const target = products.find((x) => x.id === it.productId)
      if (target && hasBatches(target)) {
        const cost = Number(it.cost) || Number(target.cost) || 0
        if (sign > 0) {
          // приход в партии; для purchase — cost из it/target, для
          // sale_return — текущая средневзвешенная (return не создаёт
          // «новую цену»).
          const useCost = doc.type === 'sale_return'
            ? weightedCostFromBatches(target.batches) || cost
            : cost
          setP(it.productId, (p) => {
            const r = addBatch(p.batches, qty, useCost, at)
            return {
              ...p,
              batches: r.batches,
              stock: totalStock(r.batches),
              cost: weightedCostFromBatches(r.batches) || p.cost || 0,
            }
          })
          moves.push({
            id: uid('mv'), type: mvType, productId: it.productId,
            name: it.name, qty, delta: qty, cost: useCost, reason, by, at,
          })
        } else {
          // расход: dir=+1 → списываем FIFO (это провод);
          // dir=-1 → отмена расхода: восстанавливаем прежние партии по it.consumed.
          if (dir < 0 && it.consumed?.length) {
            setP(it.productId, (p) => {
              const b = reverseConsume(p.batches, it.consumed)
              return {
                ...p,
                batches: b,
                stock: totalStock(b),
                cost: weightedCostFromBatches(b) || p.cost || 0,
              }
            })
            const restoreCost = it.consumed.reduce((s, c) => s + c.qty * c.cost, 0)
            moves.push({
              id: uid('mv'), type: mvType, productId: it.productId,
              name: it.name, qty, delta: qty, cost: restoreCost, reason, by, at,
            })
          } else {
            let taken = 0
            let cogs = 0
            let consumedRec = []
            setP(it.productId, (p) => {
              const r = consumeFIFO(p.batches, qty)
              taken = r.taken
              cogs = r.cost
              consumedRec = r.consumed
              return {
                ...p,
                batches: r.batches,
                stock: totalStock(r.batches),
                cost: weightedCostFromBatches(r.batches) || p.cost || 0,
              }
            })
            // Записываем consumed в позицию документа — чтобы отмена
            // проводки могла точно восстановить те же партии.
            it.consumed = consumedRec
            moves.push({
              id: uid('mv'), type: mvType, productId: it.productId,
              name: it.name, qty: taken, delta: -taken, cost: cogs, reason, by, at,
            })
          }
        }
      } else {
        // Legacy: stock как число.
        const d = sign * qty
        setP(it.productId, (p) => ({ ...p, stock: Math.max(0, p.stock + d) }))
        moves.push({
          id: uid('mv'), type: mvType, productId: it.productId,
          name: it.name, qty, delta: d, reason, by, at,
        })
      }
    }
  }
  return { products, movements: [...moves, ...state.movements] }
}
