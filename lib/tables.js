// @ts-check
// Схема таблиц и конверсии row ↔ obj (snake_case ↔ camelCase).
// Вынесено из cloud.js, чтобы merge и unit-тесты могли использовать без supabase.

/** @typedef {import('../types/domain').TableConfig} TableConfig */

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

// storeKey ↔ таблица БД; rename — поля с нестандартным переименованием.
/** @type {TableConfig[]} */
export const TABLES = [
  { key: 'priceTypes', table: 'price_types', rename: { default: 'is_default' } },
  { key: 'warehouses', table: 'warehouses' },
  { key: 'cells', table: 'cells' },
  { key: 'products', table: 'products' },
  { key: 'customers', table: 'customers' },
  { key: 'suppliers', table: 'suppliers' },
  { key: 'employees', table: 'employees' },
  { key: 'orders', table: 'orders' },
  { key: 'invoices', table: 'invoices' },
  { key: 'documents', table: 'documents' },
  { key: 'movements', table: 'movements' },
  { key: 'shifts', table: 'shifts' },
  { key: 'audit', table: 'audit' },
]

export const byKey = /** @type {Record<string, TableConfig>} */ (
  Object.fromEntries(TABLES.map((t) => [t.key, t]))
)

export function toRow(obj, cfg) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    const col = cfg.rename?.[k] || toSnake(k)
    out[col] = v
  }
  return out
}

export function fromRow(row, cfg) {
  const rev = cfg.rename
    ? Object.fromEntries(Object.entries(cfg.rename).map(([a, b]) => [b, a]))
    : {}
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null) continue
    const key = rev[k] || toCamel(k)
    out[key] = v
  }
  return out
}
