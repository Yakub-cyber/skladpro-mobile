import { parseTextToTable, autoMap, applyMapping, normNum, IMPORT_FIELDS } from './importPrice.js'

describe('importPrice: parseTextToTable', () => {
  test('TSV с заголовком', () => {
    const t = parseTextToTable('sku\tname\tprice\nA1\tГвозди\t100\nA2\tБолт\t50')
    expect(t.headers).toEqual(['sku', 'name', 'price'])
    expect(t.rows).toEqual([['A1', 'Гвозди', '100'], ['A2', 'Болт', '50']])
  })
  test('CSV с ; и кавычками', () => {
    const t = parseTextToTable('артикул;название;цена\n"A 1";"Гвозди 3×70";98\n')
    expect(t.headers).toEqual(['артикул', 'название', 'цена'])
    expect(t.rows[0]).toEqual(['A 1', 'Гвозди 3×70', '98'])
  })
  test('пустой ввод — пустая таблица', () => {
    expect(parseTextToTable('')).toEqual({ headers: [], rows: [] })
    expect(parseTextToTable('   \n\n')).toEqual({ headers: [], rows: [] })
  })
})

describe('importPrice: autoMap', () => {
  test('русские заголовки-синонимы', () => {
    const m = autoMap(['артикул', 'наименование', 'цена', 'ячейка'])
    expect(m).toMatchObject({ sku: 0, name: 1, price: 2, cell: 3 })
  })
  test('английские заголовки', () => {
    const m = autoMap(['SKU', 'Name', 'Cost', 'Stock'])
    expect(m).toMatchObject({ sku: 0, name: 1, cost: 2, stock: 3 })
  })
  test('без совпадений — позиционный маппинг', () => {
    const m = autoMap(['col1', 'col2', 'col3'])
    // POSITIONAL = sku, name, category, ...
    expect(m).toMatchObject({ sku: 0, name: 1, category: 2 })
  })
})

describe('importPrice: normNum', () => {
  test('пробелы и запятая как десятичный', () => {
    expect(normNum('1 234,50')).toBe(1234.5)
    expect(normNum('98')).toBe(98)
    expect(normNum('')).toBe(0)
    expect(normNum('абв')).toBe(0)
  })
})

describe('importPrice: applyMapping', () => {
  const table = {
    headers: ['sku', 'name', 'price'],
    rows: [['A1', 'Гвозди', '100'], ['A2', 'Болт', '50 ']],
  }
  const mapping = { sku: 0, name: 1, price: 2 }

  test('приводит числовые поля, обрезает пробелы', () => {
    const out = applyMapping(table, mapping, [])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ sku: 'A1', name: 'Гвозди', price: 100, _action: 'new' })
    expect(out[1].price).toBe(50)
  })

  test('_action=update при совпадении по SKU (case-insensitive)', () => {
    const products = [{ id: 'p1', sku: 'a1', name: 'Гвозди old', price: 50 }]
    const out = applyMapping(table, mapping, products)
    expect(out[0]._action).toBe('update')
    expect(out[0]._existing.id).toBe('p1')
    expect(out[1]._action).toBe('new')
  })

  test('строки без sku и name дропаются', () => {
    const t = { headers: ['sku', 'name'], rows: [['', ''], ['A1', 'X']] }
    const out = applyMapping(t, { sku: 0, name: 1 }, [])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('X')
  })

  test('_rowIdx учитывает строку заголовка (+2)', () => {
    const out = applyMapping(table, mapping, [])
    expect(out[0]._rowIdx).toBe(2)
    expect(out[1]._rowIdx).toBe(3)
  })
})

describe('importPrice: IMPORT_FIELDS integrity', () => {
  test('sku и name обязательные', () => {
    const req = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key)
    expect(req).toEqual(['sku', 'name'])
  })
})
