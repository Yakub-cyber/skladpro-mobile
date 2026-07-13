// @ts-check
// ──────────────────────────────────────────────────────────────────────────
//  Outbox: персистентная очередь исходящих изменений для облачного синка.
//
//  Гарантии:
//  - элемент удаляется из очереди ТОЛЬКО после подтверждения сервера
//    (или явного «drop» для перманентных ошибок вроде отсутствия таблицы
//    или RLS-отказа);
//  - очередь хранится в AsyncStorage и переживает перезагрузку приложения;
//  - неудачная отправка ретраится с экспоненциальным бэкоффом
//    (1с → 2с → 4с … до 30с), счётчик сбрасывается при успехе;
//  - по (key, id) хранится только последняя операция (компакция): новый
//    upsert заменяет старый, delete вытесняет upsert и наоборот.
//
//  Транспорт инжектируется: send(items) → { sent, dropped, error? }.
//  sent/dropped удаляются из очереди; error (транзиент) оставляет остальное
//  и планирует ретрай.
// ──────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sklad.outbox'
const DEBOUNCE_MS = 400
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000
// «Ядовитая» запись: транзиентная ошибка сама по себе ретраится бесконечно.
// Отсечка страхует от бесконечных попыток одной битой записи.
const MAX_ITEM_ATTEMPTS = 100

/** @typedef {import('../types/domain').OutboxItem} OutboxItem */
/** @typedef {import('../types/domain').OutboxStatus} OutboxStatus */
/** @typedef {import('../types/domain').OutboxSendResult} OutboxSendResult */
/** @typedef {import('../types/domain').OutboxStorage} OutboxStorage */

/** @param {OutboxItem} it */
const itemKey = (it) => `${it.key}|${it.id}`

// AsyncStorage-адаптер к API {getItem, setItem, removeItem}. Тесты подставляют
// in-memory реализацию. Импорт AsyncStorage — lazy, чтобы node-тесты
// не спотыкались на нативном модуле при загрузке outbox.
export function asyncStorageAdapter(storage) {
  if (!storage) {
    // require() внутри функции — не при загрузке модуля
    storage = require('@react-native-async-storage/async-storage').default
  }
  return {
    getItem: (k) => storage.getItem(k),
    setItem: (k, v) => storage.setItem(k, v),
    removeItem: (k) => storage.removeItem(k),
  }
}

// In-memory storage для тестов/CLI. Тот же API, что у AsyncStorage.
export function memoryStorage() {
  const map = new Map()
  return {
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, v) },
    removeItem: async (k) => { map.delete(k) },
  }
}

/**
 * @param {Object} opts
 * @param {(batch: OutboxItem[]) => Promise<OutboxSendResult | void>} opts.send
 * @param {OutboxStorage} [opts.storage]
 * @param {string} [opts.storageKey]
 * @param {number} [opts.debounceMs]
 * @param {number} [opts.baseDelayMs]
 * @param {number} [opts.maxDelayMs]
 * @param {number} [opts.maxItemAttempts]
 */
export function createOutbox({
  send,
  storage,
  storageKey = STORAGE_KEY,
  debounceMs = DEBOUNCE_MS,
  baseDelayMs = BASE_DELAY_MS,
  maxDelayMs = MAX_DELAY_MS,
  maxItemAttempts = MAX_ITEM_ATTEMPTS,
}) {
  if (!storage) storage = asyncStorageAdapter()
  let items = []
  let attempts = 0 // подряд неудачных flush (для бэкоффа)
  let flushing = null // Promise активного flush (защита от параллельных)
  let rerun = false // во время flush пришли новые элементы → повторить
  let timer = null // отложенный flush (дебаунс или бэкофф)
  let lastError = null
  let restored = false
  // Сериализуем запись в AsyncStorage: без этого две быстрые enqueue могут
  // пойти в setItem параллельно и переписать друг друга.
  let persistChain = Promise.resolve()
  const listeners = new Set()
  let lastNotified = null

  async function restore() {
    if (restored) return
    restored = true
    try {
      const raw = await storage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.items)) items = parsed.items
    } catch {
      /* повреждённый JSON — стартуем с пустой очереди */
    }
    if (items.length && !timer && !flushing) schedule(debounceMs)
    notify()
  }

  function persist() {
    persistChain = persistChain.then(async () => {
      try {
        if (items.length) await storage.setItem(storageKey, JSON.stringify({ v: 1, items }))
        else await storage.removeItem(storageKey)
      } catch (e) {
        // AsyncStorage упал (диск полный, разрешения). Данные не потеряны —
        // они в items in-memory. Следующий persist попробует ещё раз.
        console.warn('outbox persist failed:', e?.message || e)
      }
    })
    return persistChain
  }

  function status() {
    return {
      pending: items.length,
      state: lastError ? 'error' : flushing ? 'syncing' : items.length ? 'pending' : 'ok',
      error: lastError,
    }
  }

  function notify() {
    const s = status()
    const sig = `${s.pending}|${s.state}|${s.error || ''}`
    if (sig === lastNotified) return
    lastNotified = sig
    for (const cb of listeners) cb(s)
  }

  function schedule(delay) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      flushNow()
    }, delay)
  }

  // Добавить операции. Компакция по (key, id): остаётся последняя.
  function enqueue(batch) {
    if (!batch?.length) return
    for (const it of batch) {
      const k = itemKey(it)
      const i = items.findIndex((x) => itemKey(x) === k)
      if (i >= 0) items.splice(i, 1)
      items.push(it)
    }
    persist()
    if (!timer && !flushing) schedule(debounceMs)
    notify()
  }

  // Отправить всё, что накопилось. Очередь чистится только по подтверждению.
  async function flushNow() {
    if (flushing) {
      rerun = true
      return flushing
    }
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!items.length) {
      lastError = null
      notify()
      return true
    }
    /** @type {(v: boolean) => void} */
    let resolveDone = () => {}
    flushing = new Promise((r) => (resolveDone = r))
    notify()
    let ok = false
    const batch = items.slice()
    try {
      /** @type {OutboxSendResult} */
      const res = (await send(batch)) || {}
      const gone = new Set([...(res.sent || []), ...(res.dropped || [])].map(itemKey))
      // Удаляем только элементы из отправленного батча: если во время
      // отправки элемент заменила компакция (данные новее) — он остаётся.
      items = items.filter((it) => !(gone.has(itemKey(it)) && batch.includes(it)))
      persist()
      if (res.error) throw res.error
      for (const it of items) delete it._attempts
      attempts = 0
      lastError = null
      ok = items.length === 0
    } catch (e) {
      attempts += 1
      lastError = e?.message || String(e)
      const dead = []
      for (const it of batch) {
        it._attempts = (it._attempts || 0) + 1
        if (it._attempts > maxItemAttempts) dead.push(it)
      }
      if (dead.length) {
        console.warn(
          `outbox: сброшено ${dead.length} «застрявших» записей после ${maxItemAttempts} попыток`,
          dead.map(itemKey),
        )
        const drop = new Set(dead.map(itemKey))
        items = items.filter((it) => !drop.has(itemKey(it)))
      }
      persist()
      schedule(Math.min(baseDelayMs * 2 ** (attempts - 1), maxDelayMs))
    }
    flushing = null
    resolveDone(ok)
    if (rerun || (items.length && !lastError && !timer)) {
      rerun = false
      schedule(debounceMs)
    }
    notify()
    return ok
  }

  return {
    restore,
    enqueue,
    flushNow,
    status,
    items: () => items.slice(),
    onChange: (cb) => {
      listeners.add(cb)
      cb(status())
      return () => listeners.delete(cb)
    },
    reset: async () => {
      if (timer) clearTimeout(timer)
      timer = null
      items = []
      attempts = 0
      lastError = null
      rerun = false
      lastNotified = null
      await persist()
    },
    destroy: () => {
      if (timer) clearTimeout(timer)
      timer = null
      listeners.clear()
    },
  }
}
