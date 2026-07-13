import { applyDocToState } from './docEngine.js'

// Компактный конструктор состояния для тестов.
const S = (products, movements = []) => ({ products, movements })
const P = (id, stock, extra = {}) => ({ id, name: id.toUpperCase(), stock, warehouseId: 'wh1', ...extra })

describe('docEngine: purchase (закупка)', () => {
  test('увеличивает остаток на qty, пишет movement с delta=+qty', () => {
    const state = S([P('p1', 10)])
    const doc = { no: 'ЗАК-1', type: 'purchase', items: [{ productId: 'p1', name: 'P1', qty: 5 }] }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(15)
    expect(movements[0]).toMatchObject({ productId: 'p1', delta: 5, qty: 5, type: 'in', by: 'e1' })
  })

  test('откат (dir=-1) уменьшает остаток обратно', () => {
    const state = S([P('p1', 15)])
    const doc = { no: 'ЗАК-1', type: 'purchase', items: [{ productId: 'p1', name: 'P1', qty: 5 }] }
    const { products, movements } = applyDocToState(state, doc, -1, 'e1')
    expect(products[0].stock).toBe(10)
    expect(movements[0].delta).toBe(-5)
    expect(movements[0].reason).toMatch(/Отмена/)
  })
})

describe('docEngine: sale (продажа)', () => {
  test('уменьшает остаток на qty, type=writeoff', () => {
    const state = S([P('p1', 10)])
    const doc = { no: 'ПРД-1', type: 'sale', items: [{ productId: 'p1', name: 'P1', qty: 3 }] }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(7)
    expect(movements[0]).toMatchObject({ delta: -3, type: 'writeoff' })
  })

  test('остаток не уходит ниже нуля при списании больше запаса', () => {
    const state = S([P('p1', 5)])
    const doc = { no: 'ПРД-1', type: 'sale', items: [{ productId: 'p1', name: 'P1', qty: 100 }] }
    const { products } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(0)
  })
})

describe('docEngine: sale_return (возврат продажи)', () => {
  test('возвращает товар на склад: delta=+qty, type=return', () => {
    const state = S([P('p1', 5)])
    const doc = { no: 'ВЗП-1', type: 'sale_return', items: [{ productId: 'p1', name: 'P1', qty: 2 }] }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(7)
    expect(movements[0]).toMatchObject({ delta: 2, type: 'return' })
  })
})

describe('docEngine: writeoff (списание)', () => {
  test('уменьшает остаток, type=writeoff', () => {
    const state = S([P('p1', 8)])
    const doc = { no: 'СПС-1', type: 'writeoff', items: [{ productId: 'p1', name: 'P1', qty: 2 }] }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(6)
    expect(movements[0].type).toBe('writeoff')
  })
})

describe('docEngine: transfer (перемещение)', () => {
  test('переносит товар в toWarehouseId, delta=0', () => {
    const state = S([P('p1', 10, { warehouseId: 'wh1' })])
    const doc = {
      no: 'ПРМ-1', type: 'transfer', toWarehouseId: 'wh2',
      items: [{ productId: 'p1', name: 'P1', qty: 10, fromWh: 'wh1' }],
    }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].warehouseId).toBe('wh2')
    expect(products[0].stock).toBe(10) // не меняется
    expect(movements[0]).toMatchObject({ delta: 0, type: 'transfer' })
  })

  test('откат возвращает товар в fromWh из item', () => {
    const state = S([P('p1', 10, { warehouseId: 'wh2' })])
    const doc = {
      no: 'ПРМ-1', type: 'transfer', toWarehouseId: 'wh2',
      items: [{ productId: 'p1', name: 'P1', qty: 10, fromWh: 'wh1' }],
    }
    const { products } = applyDocToState(state, doc, -1, 'e1')
    expect(products[0].warehouseId).toBe('wh1')
  })
})

describe('docEngine: inventory (инвентаризация)', () => {
  test('устанавливает stock в target, пишет movement с фактическим delta', () => {
    const state = S([P('p1', 10)])
    const doc = {
      no: 'ИНВ-1', type: 'inventory',
      items: [{ productId: 'p1', name: 'P1', qty: 12, prevStock: 10 }],
    }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(12)
    expect(movements[0]).toMatchObject({ delta: 2, qty: 2, reason: 'Излишек' })
  })

  test('недостача: delta отрицательная, reason=Недостача', () => {
    const state = S([P('p1', 10)])
    const doc = {
      no: 'ИНВ-1', type: 'inventory',
      items: [{ productId: 'p1', name: 'P1', qty: 7, prevStock: 10 }],
    }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products[0].stock).toBe(7)
    expect(movements[0]).toMatchObject({ delta: -3, qty: 3, reason: 'Недостача' })
  })

  test('без изменений (target = prevStock) — movement не пишется', () => {
    const state = S([P('p1', 10)])
    const doc = {
      no: 'ИНВ-1', type: 'inventory',
      items: [{ productId: 'p1', name: 'P1', qty: 10, prevStock: 10 }],
    }
    const { movements } = applyDocToState(state, doc, 1, 'e1')
    expect(movements.length).toBe(0)
  })

  test('откат возвращает stock к prevStock', () => {
    const state = S([P('p1', 12)]) // после проводки было 12
    const doc = {
      no: 'ИНВ-1', type: 'inventory',
      items: [{ productId: 'p1', name: 'P1', qty: 12, prevStock: 10 }],
    }
    const { products } = applyDocToState(state, doc, -1, 'e1')
    expect(products[0].stock).toBe(10)
  })
})

describe('docEngine: инварианты', () => {
  test('исходный state не мутируется (products — новый массив)', () => {
    const original = [P('p1', 10)]
    const state = S(original)
    const doc = { no: 'ЗАК-1', type: 'purchase', items: [{ productId: 'p1', name: 'P1', qty: 5 }] }
    const { products } = applyDocToState(state, doc, 1, 'e1')
    expect(original[0].stock).toBe(10) // оригинал не тронут
    expect(products).not.toBe(original)
    expect(products[0]).not.toBe(original[0])
  })

  test('новые движения кладутся в начало массива (последние сверху)', () => {
    const oldMove = { id: 'mv_old', at: '2020-01-01', delta: 1 }
    const state = S([P('p1', 10)], [oldMove])
    const doc = { no: 'ЗАК-1', type: 'purchase', items: [{ productId: 'p1', name: 'P1', qty: 5 }] }
    const { movements } = applyDocToState(state, doc, 1, 'e1')
    expect(movements.length).toBe(2)
    expect(movements[0].delta).toBe(5) // новое сверху
    expect(movements[1]).toBe(oldMove) // старое снизу
  })

  test('несколько позиций в одном документе обрабатываются каждая', () => {
    const state = S([P('p1', 10), P('p2', 20)])
    const doc = {
      no: 'ЗАК-1', type: 'purchase',
      items: [
        { productId: 'p1', name: 'P1', qty: 5 },
        { productId: 'p2', name: 'P2', qty: 3 },
      ],
    }
    const { products, movements } = applyDocToState(state, doc, 1, 'e1')
    expect(products.find((p) => p.id === 'p1').stock).toBe(15)
    expect(products.find((p) => p.id === 'p2').stock).toBe(23)
    expect(movements.length).toBe(2)
  })
})
