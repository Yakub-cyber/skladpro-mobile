// Доменные типы для облачного слоя и стора.
// Файл подключается автоматически (см. include в tsconfig.json).
// Использовать в .js через JSDoc: /** @type {import('../types/domain').Product} */

export type Uid = string
export type IsoDate = string

export interface PriceType { id: Uid; name: string; default?: boolean; updatedAt?: IsoDate }
export interface Warehouse { id: Uid; name: string; updatedAt?: IsoDate }
export interface Cell { id: Uid; warehouseId: Uid; code: string; updatedAt?: IsoDate }

export interface Product {
  id: Uid
  name: string
  sku?: string
  barcode?: string
  warehouseId?: Uid
  cellId?: Uid
  stock: number
  cost?: number
  prices?: Record<Uid, number>
  category?: string
  updatedAt?: IsoDate
}

export interface Customer {
  id: Uid
  name: string
  phone?: string
  priceTypeId?: Uid
  balance?: number
  updatedAt?: IsoDate
}

export interface Supplier { id: Uid; name: string; balance?: number; updatedAt?: IsoDate }

export interface Employee {
  id: Uid
  name: string
  role: 'admin' | 'manager' | 'warehouse' | 'courier' | 'cashier'
  authUid?: Uid
  active?: boolean
  pin?: string
  updatedAt?: IsoDate
}

export interface OrderItem {
  productId: Uid
  name: string
  qty: number
  price: number
}

export interface Order {
  id: Uid
  no: string
  customerId?: Uid
  customerName?: string
  priceTypeId?: Uid
  status: 'new' | 'reserved' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  assignedTo?: Uid
  items: OrderItem[]
  total?: number
  updatedAt?: IsoDate
}

export interface Invoice {
  id: Uid
  no: string
  partyId?: Uid
  priceTypeId?: Uid
  items: OrderItem[]
  total?: number
  updatedAt?: IsoDate
}

export type DocType =
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'writeoff'
  | 'supplier_return'
  | 'transfer'
  | 'inventory'

export interface Document {
  id: Uid
  no: string
  type: DocType
  toWarehouseId?: Uid
  items: OrderItem[]
  posted?: boolean
  reason?: string
  updatedAt?: IsoDate
}

export interface Movement {
  id: Uid
  type: string
  productId: Uid
  name: string
  qty: number
  delta: number
  reason?: string
  by?: string
  at: IsoDate
}

export interface Shift {
  id: Uid
  openedAt: IsoDate
  closedAt?: IsoDate
  openedBy?: Uid
  updatedAt?: IsoDate
}

export interface AuditRecord {
  id: Uid
  at: IsoDate
  by?: string
  action: string
  meta?: Record<string, unknown>
}

// ── Outbox / синхронизация ──────────────────────────────────────────────────

export type TableKey =
  | 'priceTypes' | 'warehouses' | 'cells' | 'products'
  | 'customers' | 'suppliers' | 'employees' | 'orders'
  | 'invoices' | 'documents' | 'movements' | 'shifts' | 'audit'

export interface TableConfig {
  key: TableKey
  table: string
  rename?: Record<string, string>
}

export type OutboxOp = 'upsert' | 'delete'

export interface OutboxItem {
  op: OutboxOp
  key: TableKey
  id: Uid
  row?: Record<string, unknown>
  _attempts?: number
}

export interface OutboxStatus {
  pending: number
  state: 'ok' | 'pending' | 'syncing' | 'error'
  error: string | null
}

export interface OutboxSendResult {
  sent?: OutboxItem[]
  dropped?: OutboxItem[]
  error?: unknown
}

export interface OutboxStorage {
  getItem: (k: string) => Promise<string | null>
  setItem: (k: string, v: string) => Promise<void>
  removeItem: (k: string) => Promise<void>
}
