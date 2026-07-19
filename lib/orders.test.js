import {
  OPEN_STATUSES,
  CONSUMED_STATUSES,
  stockConsumedFromStatus,
  reservedByProduct,
  availableStock,
  applyOrderStock,
  migrateReservationV8,
} from './orders.js'

const P = (id, stock, extra = {}) => ({ id, name: id, stock, ...extra })
const OI = (productId, qty, extra = {}) => ({ productId, name: productId, qty, ...extra })
const O = (id, status, items, extra = {}) => ({ id, no: id, status, items, ...extra })

describe('orders: константы модели', () => {
  test('OPEN не пересекается с CONSUMED', () => {
    for (const s of OPEN_STATUSES) expect(CONSUMED_STATUSES).not.toContain(s)
  })
  test('stockConsumedFromStatus', () => {
    expect(stockConsumedFromStatus('shipped')).toBe(true)
    expect(stockConsumedFromStatus('delivered')).toBe(true)
    expect(stockConsumedFromStatus('new')).toBe(false)
    expect(stockConsumedFromStatus('cancelled')).toBe(false)
  })
})

describe('orders: reservedByProduct', () => {
  test('суммирует qty по открытым заказам', () => {
    const orders = [
      O('o1', 'new', [OI('p1', 3), OI('p2', 1)]),
      O('o2', 'packed', [OI('p1', 2)]),
      O('o3', 'shipped', [OI('p1', 5)]), // не считаем — consumed
      O('o4', 'cancelled', [OI('p1', 100)]),
    ]
    expect(reservedByProduct(orders)).toEqual({ p1: 5, p2: 1 })
  })
  test('заказы с stockConsumed=true не резервируют (уже списано)', () => {
    const orders = [O('o1', 'packed', [OI('p1', 3)], { stockConsumed: true })]
    expect(reservedByProduct(orders)).toEqual({})
  })
  test('availableStock = stock − reserved', () => {
    const orders = [O('o1', 'new', [OI('p1', 3)])]
    const r = reservedByProduct(orders)
    expect(availableStock({ id: 'p1', stock: 10 }, r)).toBe(7)
    expect(availableStock({ id: 'p2', stock: 5 }, r)).toBe(5)
  })
})

describe('orders: applyOrderStock', () => {
  test('dir=-1 списывает stock', () => {
    const s = { products: [P('p1', 10)] }
    const o = O('o1', 'packed', [OI('p1', 4)])
    const r = applyOrderStock(s, o, -1)
    expect(r.products[0].stock).toBe(6)
  })
  test('dir=+1 возвращает stock', () => {
    const s = { products: [P('p1', 6)] }
    const o = O('o1', 'shipped', [OI('p1', 4)])
    const r = applyOrderStock(s, o, 1)
    expect(r.products[0].stock).toBe(10)
  })
  test('stock не уходит ниже нуля при переливе', () => {
    const s = { products: [P('p1', 3)] }
    const o = O('o1', 'packed', [OI('p1', 10)])
    const r = applyOrderStock(s, o, -1)
    expect(r.products[0].stock).toBe(0)
  })
  test('маркировка: dir=-1 выбывают первые коды, сохраняются в it.codes', () => {
    const s = { products: [P('p1', 10, { marked: true, codes: ['A', 'B', 'C', 'D'] })] }
    const o = O('o1', 'packed', [OI('p1', 2)])
    const r = applyOrderStock(s, o, -1)
    expect(r.products[0].codes).toEqual(['C', 'D'])
    expect(r.order.items[0].codes).toEqual(['A', 'B'])
  })
  test('маркировка: dir=+1 восстанавливает коды в пул, чистит it.codes', () => {
    const s = { products: [P('p1', 8, { marked: true, codes: ['C', 'D'] })] }
    const o = O('o1', 'shipped', [OI('p1', 2, { codes: ['A', 'B'] })])
    const r = applyOrderStock(s, o, 1)
    expect(r.products[0].codes.sort()).toEqual(['A', 'B', 'C', 'D'])
    expect(r.order.items[0].codes).toEqual([])
  })
  test('маркировка: возврат без дублей', () => {
    const s = { products: [P('p1', 8, { marked: true, codes: ['A', 'B'] })] }
    const o = O('o1', 'shipped', [OI('p1', 2, { codes: ['A', 'B'] })])
    const r = applyOrderStock(s, o, 1)
    expect(r.products[0].codes.sort()).toEqual(['A', 'B'])
  })
})

describe('orders: migrateReservationV8', () => {
  test('открытые заказы: возвращает stock и коды, ставит stockConsumed=false', () => {
    // legacy: stock уже уменьшен на 3, коды в it.codes
    const state = {
      products: [P('p1', 7, { marked: true, codes: ['C'] })],
      orders: [O('o1', 'new', [OI('p1', 3, { codes: ['A', 'B'] })])],
    }
    const m = migrateReservationV8(state)
    expect(m.products[0].stock).toBe(10) // 7 + 3
    expect(m.products[0].codes.sort()).toEqual(['A', 'B', 'C'])
    expect(m.orders[0].items[0].codes).toEqual([])
    expect(m.orders[0].stockConsumed).toBe(false)
  })
  test('отгруженные: stockConsumed=true, ничего не возвращаем', () => {
    const state = {
      products: [P('p1', 5)],
      orders: [O('o1', 'shipped', [OI('p1', 3)])],
    }
    const m = migrateReservationV8(state)
    expect(m.products[0].stock).toBe(5) // не меняется
    expect(m.orders[0].stockConsumed).toBe(true)
  })
  test('отменённые: stockConsumed=false, stock не трогаем', () => {
    const state = {
      products: [P('p1', 5)],
      orders: [O('o1', 'cancelled', [OI('p1', 3)])],
    }
    const m = migrateReservationV8(state)
    expect(m.products[0].stock).toBe(5)
    expect(m.orders[0].stockConsumed).toBe(false)
  })
  test('идемпотентно: заказ уже с stockConsumed пропускается', () => {
    const state = {
      products: [P('p1', 5)],
      orders: [O('o1', 'new', [OI('p1', 3)], { stockConsumed: false })],
    }
    const m = migrateReservationV8(state)
    expect(m.products[0].stock).toBe(5) // stock уже не в legacy-состоянии
    expect(m.orders[0].stockConsumed).toBe(false)
  })
})
