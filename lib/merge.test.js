import { applyPendingToData, localWins } from './merge.js'

// row из outbox — уже snake_case + company_id + updated_at (см. attachSync).
const upRow = (key, id, row) => ({
  op: 'upsert', key, id,
  row: { id, ...row },
})
const delRow = (key, id) => ({ op: 'delete', key, id })

describe('merge: localWins', () => {
  test('без меток → локальное побеждает (совместимость до миграции)', () => {
    expect(localWins({ id: 'p1' }, { id: 'p1' })).toBe(true)
    expect(localWins({ id: 'p1', updatedAt: '2026-07-14' }, { id: 'p1' })).toBe(true)
    expect(localWins({ id: 'p1' }, { id: 'p1', updatedAt: '2026-07-14' })).toBe(true)
  })

  test('локальное новее → побеждает', () => {
    expect(localWins(
      { updatedAt: '2026-07-14T12:00:00Z' },
      { updatedAt: '2026-07-14T11:00:00Z' },
    )).toBe(true)
  })

  test('серверное новее → сервер побеждает', () => {
    expect(localWins(
      { updatedAt: '2026-07-14T10:00:00Z' },
      { updatedAt: '2026-07-14T11:00:00Z' },
    )).toBe(false)
  })

  test('одинаковое время → локальное выигрывает (>=)', () => {
    expect(localWins(
      { updatedAt: '2026-07-14T12:00:00Z' },
      { updatedAt: '2026-07-14T12:00:00Z' },
    )).toBe(true)
  })
})

describe('merge: applyPendingToData — upsert', () => {
  test('новый локальный (нет на сервере) — добавляется', () => {
    const data = { products: [{ id: 'p1', name: 'A', stock: 5 }] }
    const pending = [upRow('products', 'p2', { name: 'B', stock: 10 })]
    applyPendingToData(data, pending)
    expect(data.products.length).toBe(2)
    expect(data.products.find((r) => r.id === 'p2').name).toBe('B')
  })

  test('локальный свежее серверного — заменяет', () => {
    const data = {
      products: [{ id: 'p1', name: 'server', stock: 5, updatedAt: '2026-07-14T10:00:00Z' }],
    }
    const pending = [upRow('products', 'p1', {
      name: 'local-newer', stock: 8, updated_at: '2026-07-14T11:00:00Z',
    })]
    applyPendingToData(data, pending)
    expect(data.products[0].name).toBe('local-newer')
    expect(data.products[0].stock).toBe(8)
  })

  test('серверный свежее — локальное игнорируется', () => {
    const data = {
      products: [{ id: 'p1', name: 'server-newer', stock: 5, updatedAt: '2026-07-14T12:00:00Z' }],
    }
    const pending = [upRow('products', 'p1', {
      name: 'local-stale', stock: 2, updated_at: '2026-07-14T10:00:00Z',
    })]
    applyPendingToData(data, pending)
    expect(data.products[0].name).toBe('server-newer')
    expect(data.products[0].stock).toBe(5)
  })
})

describe('merge: applyPendingToData — delete', () => {
  test('удаление применяется, даже если сервер вернул строку', () => {
    const data = { products: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] }
    applyPendingToData(data, [delRow('products', 'p1')])
    expect(data.products.map((r) => r.id)).toEqual(['p2'])
  })

  test('удаление отсутствующей строки — no-op', () => {
    const data = { products: [{ id: 'p1', name: 'A' }] }
    applyPendingToData(data, [delRow('products', 'p999')])
    expect(data.products.length).toBe(1)
  })
})

describe('merge: applyPendingToData — граничные', () => {
  test('неизвестный key — пропускается без ошибки', () => {
    const data = { products: [{ id: 'p1' }] }
    applyPendingToData(data, [upRow('unknownTable', 'x', { name: 'X' })])
    expect(data.products.length).toBe(1)
  })

  test('data[key] отсутствует — пропускается', () => {
    const data = {} // серверный снапшот не содержит orders
    applyPendingToData(data, [upRow('orders', 'o1', { no: 'ORD-1' })])
    expect(data.orders).toBeUndefined()
  })

  test('rename-поля восстанавливаются (default ↔ is_default)', () => {
    // TableConfig priceTypes имеет rename { default: 'is_default' }
    // outbox хранит row с is_default (snake из toRow), при fromRow должно
    // вернуться как default в camelCase-объекте.
    const data = { priceTypes: [] }
    applyPendingToData(data, [{
      op: 'upsert', key: 'priceTypes', id: 'pt1',
      row: { id: 'pt1', name: 'Розница', is_default: true },
    }])
    expect(data.priceTypes[0]).toMatchObject({ id: 'pt1', name: 'Розница', default: true })
  })

  test('snake_case поля становятся camelCase после fromRow', () => {
    const data = { customers: [] }
    applyPendingToData(data, [{
      op: 'upsert', key: 'customers', id: 'c1',
      row: { id: 'c1', name: 'Иван', price_type_id: 'pt1' },
    }])
    expect(data.customers[0]).toMatchObject({ id: 'c1', name: 'Иван', priceTypeId: 'pt1' })
  })
})
