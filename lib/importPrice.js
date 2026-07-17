// Портированные из веба чистые функции разбора прайса (CSV/TSV/TXT).
// XLSX не поддерживается в мобильной версии (SheetJS ~1 МБ + требует
// нативной интеграции файлов — держим лёгкий MVP через paste-в-буфер).
//
// Экспортирует: IMPORT_FIELDS, FIELD_SYNONYMS, parseTextToTable,
// autoMap, applyMapping — используется в app/import-products.jsx.

export const IMPORT_FIELDS = [
  { key: 'sku', label: 'Артикул (SKU)', required: true },
  { key: 'name', label: 'Название', required: true },
  { key: 'category', label: 'Категория' },
  { key: 'unit', label: 'Ед. изм.' },
  { key: 'price', label: 'Цена', numeric: true },
  { key: 'cost', label: 'Себестоимость', numeric: true },
  { key: 'stock', label: 'Остаток', numeric: true },
  { key: 'minStock', label: 'Мин. остаток', numeric: true },
  { key: 'cell', label: 'Ячейка' },
  { key: 'barcode', label: 'Штрихкод' },
]

export const FIELD_SYNONYMS = {
  sku: ['артикул', 'sku', 'код', 'код товара'],
  name: ['название', 'наименование', 'name', 'товар'],
  category: ['категория', 'группа', 'category', 'group'],
  unit: ['ед', 'единица', 'ед.изм', 'unit', 'ед изм'],
  price: ['цена', 'опт', 'цена опт', 'price', 'цена продажи'],
  cost: ['закуп', 'закупка', 'себест', 'себестоимость', 'cost'],
  stock: ['остаток', 'кол-во', 'количество', 'склад', 'stock', 'qty', 'остатки'],
  minStock: ['мин', 'минимум', 'min', 'мин остаток'],
  cell: ['ячейка', 'место', 'cell', 'ряд', 'локация'],
  barcode: ['штрих', 'штрихкод', 'ean', 'barcode'],
}

const POSITIONAL = ['sku', 'name', 'category', 'unit', 'price', 'cost', 'stock', 'minStock', 'cell']

export const normNum = (v) => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) || ''
  if (line.includes('\t')) return '\t'
  if (line.includes(';')) return ';'
  return ','
}

function splitRow(line, d) {
  return line.split(d).map((c) => c.trim().replace(/^"|"$/g, ''))
}

function matchField(header) {
  const h = header.toLowerCase().trim()
  for (const [field, syns] of Object.entries(FIELD_SYNONYMS)) {
    if (syns.some((s) => h === s || h.includes(s))) return field
  }
  return null
}

// text → { headers, rows }. Разделитель угадывается: таб/;/, — что первое найдётся.
export function parseTextToTable(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const d = detectDelimiter(text)
  return { headers: splitRow(lines[0], d), rows: lines.slice(1).map((l) => splitRow(l, d)) }
}

// Автомаппинг: по заголовкам столбцов возвращает { fieldKey → columnIndex }.
// Если совпадений < 2 — позиционный маппинг (первые N полей ↔ первые N колонок).
export function autoMap(headers) {
  const mapping = {}
  headers.forEach((h, i) => {
    const field = matchField(h)
    if (field && mapping[field] == null) mapping[field] = i
  })
  if (Object.keys(mapping).length < 2) {
    POSITIONAL.slice(0, headers.length).forEach((field, i) => {
      if (mapping[field] == null) mapping[field] = i
    })
  }
  return mapping
}

// rows таблицы → массив объектов { sku, name, price… } с _action ('new'|'update')
// и _rowIdx (номер строки в исходной таблице) для UI-подсветки ошибок.
export function applyMapping(table, mapping, products = []) {
  const numericFields = new Set(IMPORT_FIELDS.filter((f) => f.numeric).map((f) => f.key))
  const bySku = {}
  for (const p of products) bySku[String(p.sku).toLowerCase()] = p

  return table.rows
    .map((cells, rowIdx) => {
      const obj = {}
      for (const [field, colIdx] of Object.entries(mapping)) {
        if (colIdx == null || colIdx === '' || colIdx === -1) continue
        const raw = cells[colIdx]
        if (raw == null || raw === '') continue
        obj[field] = numericFields.has(field) ? normNum(raw) : String(raw).trim()
      }
      if (!obj.sku && !obj.name) return null
      const existing = obj.sku ? bySku[String(obj.sku).toLowerCase()] : null
      return {
        ...obj,
        _existing: existing || null,
        _action: existing ? 'update' : 'new',
        _rowIdx: rowIdx + 2,
      }
    })
    .filter(Boolean)
}

export const SAMPLE_TEMPLATE =
  'артикул\tназвание\tкатегория\tед\tцена\tзакупка\tостаток\tминимум\tячейка\n' +
  'КР-0070\tГвозди 3×70\tКрепёж\tкг\t98\t64\t150\t40\tA1\n' +
  'НОВ-001\tСетка сварная 50×50\tКрепёж\tрул\t1200\t850\t30\t10\tB5'
