import {
  hasBatches,
  totalStock,
  weightedCostFromBatches,
  addBatch,
  consumeFIFO,
  reverseConsume,
} from './batches.js'

const B = (id, qty, cost, at) => ({ id, qty, cost, at })

describe('batches: hasBatches', () => {
  test('true для массива, false для undefined/пустого поля', () => {
    expect(hasBatches({ batches: [] })).toBe(true)
    expect(hasBatches({ batches: [B('b1', 1, 10, '2026-01-01')] })).toBe(true)
    expect(hasBatches({})).toBe(false)
    expect(hasBatches({ batches: null })).toBe(false)
  })
})

describe('batches: totalStock / weightedCostFromBatches', () => {
  test('totalStock — сумма qty', () => {
    expect(totalStock([B('a', 3, 10), B('b', 2.5, 15)])).toBe(5.5)
    expect(totalStock([])).toBe(0)
  })
  test('weightedCostFromBatches — взвешенная средняя', () => {
    // 3×10 + 2×20 = 70; qty=5; wa = 14
    expect(weightedCostFromBatches([B('a', 3, 10), B('b', 2, 20)])).toBe(14)
    expect(weightedCostFromBatches([])).toBe(0)
    // партия с qty<=0 не считается
    expect(weightedCostFromBatches([B('a', 0, 999), B('b', 2, 20)])).toBe(20)
  })
})

describe('batches: addBatch', () => {
  test('добавляет партию, возвращает id', () => {
    const r = addBatch([], 5, 100, '2026-01-01')
    expect(r.batches).toHaveLength(1)
    expect(r.batches[0]).toMatchObject({ qty: 5, cost: 100, at: '2026-01-01' })
    expect(r.batchId).toBeTruthy()
  })
  test('qty<=0 — no-op', () => {
    const r = addBatch([B('a', 1, 10)], 0, 100)
    expect(r.batches).toHaveLength(1)
    expect(r.batchId).toBeNull()
  })
})

describe('batches: consumeFIFO', () => {
  test('старейшая партия уходит первой', () => {
    const b = [B('b1', 5, 10, '2026-01-01'), B('b2', 5, 20, '2026-02-01')]
    const r = consumeFIFO(b, 3)
    expect(r.taken).toBe(3)
    expect(r.cost).toBe(30) // 3×10
    expect(r.batches).toEqual([B('b1', 2, 10, '2026-01-01'), B('b2', 5, 20, '2026-02-01')])
    expect(r.consumed).toEqual([{ batchId: 'b1', qty: 3, cost: 10 }])
  })
  test('перескакивает исчерпанную партию', () => {
    const b = [B('b1', 5, 10, '2026-01-01'), B('b2', 5, 20, '2026-02-01')]
    const r = consumeFIFO(b, 7)
    expect(r.taken).toBe(7)
    // b1 съеден весь: 5×10 = 50; из b2 берём 2: 2×20 = 40 → 90
    expect(r.cost).toBe(90)
    expect(r.batches).toEqual([B('b2', 3, 20, '2026-02-01')])
    expect(r.consumed).toEqual([
      { batchId: 'b1', qty: 5, cost: 10 },
      { batchId: 'b2', qty: 2, cost: 20 },
    ])
  })
  test('запрос больше доступного: taken = сколько было', () => {
    const b = [B('b1', 3, 10, '2026-01-01')]
    const r = consumeFIFO(b, 10)
    expect(r.taken).toBe(3)
    expect(r.batches).toEqual([])
  })
  test('qty=0 — no-op', () => {
    const b = [B('b1', 5, 10, '2026-01-01')]
    const r = consumeFIFO(b, 0)
    expect(r).toEqual({ batches: b, taken: 0, cost: 0, consumed: [] })
  })
  test('вход не мутируется', () => {
    const b = [B('b1', 5, 10, '2026-01-01')]
    const copy = JSON.parse(JSON.stringify(b))
    consumeFIFO(b, 3)
    expect(b).toEqual(copy)
  })
})

describe('batches: reverseConsume', () => {
  test('восстанавливает qty в существующие партии', () => {
    const b = [B('b1', 2, 10, '2026-01-01')]
    const consumed = [{ batchId: 'b1', qty: 3, cost: 10 }]
    const r = reverseConsume(b, consumed)
    expect(r).toEqual([B('b1', 5, 10, '2026-01-01')])
  })
  test('пересоздаёт съеденную партию с прежним id и cost', () => {
    const b = [] // b1 съеден полностью
    const consumed = [{ batchId: 'b1', qty: 5, cost: 10 }]
    const r = reverseConsume(b, consumed)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'b1', qty: 5, cost: 10 })
  })
  test('пустой consumed — возвращает исходное', () => {
    const b = [B('b1', 2, 10, '2026-01-01')]
    expect(reverseConsume(b, [])).toBe(b)
  })
})

describe('batches: round-trip consume + reverse', () => {
  test('consumeFIFO(N) → reverseConsume должно вернуть исходное количество и cost', () => {
    const b = [B('b1', 5, 10, '2026-01-01'), B('b2', 5, 20, '2026-02-01')]
    const r = consumeFIFO(b, 7)
    const back = reverseConsume(r.batches, r.consumed)
    expect(totalStock(back)).toBe(10) // 5 + 5
    expect(weightedCostFromBatches(back)).toBe(15) // (50 + 100) / 10
  })
})
