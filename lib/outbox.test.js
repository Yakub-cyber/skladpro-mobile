import { createOutbox, memoryStorage } from './outbox.js'

// Ждать N миллисекунд, чтобы дать outbox отработать debounce/backoff.
// jest.useFakeTimers() не берём — в outbox есть настоящие Promise-chain-и
// на persist, с fake timers их сложнее координировать. Настоящий setTimeout
// проще: тесты по секундам, но всё равно быстрые (≤10ms).
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))

// Ловушка send: сохраняет батчи, отвечает по инструкции { ok / error / dropped }.
function makeSend() {
  const calls = []
  let resp = { sent: 'all' } // 'all' → все items считаются sent
  const fn = async (batch) => {
    calls.push(batch.map((it) => ({ ...it })))
    if (resp.throw) throw resp.throw
    if (resp.sent === 'all') return { sent: batch, dropped: [] }
    return {
      sent: resp.sent || [],
      dropped: resp.dropped || [],
      error: resp.error,
    }
  }
  fn.calls = calls
  fn.setResp = (r) => { resp = r }
  return fn
}

const it1 = { op: 'upsert', key: 'products', id: 'p1', row: { id: 'p1', name: 'A' } }
const it2 = { op: 'upsert', key: 'products', id: 'p2', row: { id: 'p2', name: 'B' } }
const it1v2 = { op: 'upsert', key: 'products', id: 'p1', row: { id: 'p1', name: 'A2' } }
const del1 = { op: 'delete', key: 'products', id: 'p1' }

describe('outbox: базовый flush', () => {
  test('enqueue → флашится через debounce, очередь пустеет', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.enqueue([it1, it2])
    expect(box.items().length).toBe(2)
    await tick(30)
    expect(send.calls.length).toBe(1)
    expect(send.calls[0].length).toBe(2)
    expect(box.items().length).toBe(0)
    expect(box.status().state).toBe('ok')
    box.destroy()
  })

  test('flushNow отправляет немедленно', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5000 })
    box.enqueue([it1])
    await box.flushNow()
    expect(send.calls.length).toBe(1)
    expect(box.items().length).toBe(0)
    box.destroy()
  })

  test('пустая очередь — flushNow возвращает true без вызова send', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage() })
    const ok = await box.flushNow()
    expect(ok).toBe(true)
    expect(send.calls.length).toBe(0)
    box.destroy()
  })
})

describe('outbox: компакция по (key, id)', () => {
  test('повторный upsert того же id заменяет предыдущий', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.enqueue([it1])
    box.enqueue([it1v2])
    expect(box.items().length).toBe(1)
    expect(box.items()[0].row.name).toBe('A2')
    await tick(30)
    expect(send.calls[0][0].row.name).toBe('A2')
    box.destroy()
  })

  test('delete вытесняет upsert того же id', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.enqueue([it1])
    box.enqueue([del1])
    expect(box.items().length).toBe(1)
    expect(box.items()[0].op).toBe('delete')
    box.destroy()
  })

  test('upsert вытесняет предыдущий delete', async () => {
    const send = makeSend()
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.enqueue([del1])
    box.enqueue([it1])
    expect(box.items().length).toBe(1)
    expect(box.items()[0].op).toBe('upsert')
    box.destroy()
  })
})

describe('outbox: ретраи при транзиентной ошибке', () => {
  test('после сбоя элемент остаётся в очереди и повторяется', async () => {
    const send = makeSend()
    send.setResp({ throw: new Error('network down') })
    // baseDelayMs=200, tick=30 → только один send успевает (retry ждёт ≥200ms).
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5, baseDelayMs: 200 })
    box.enqueue([it1])
    await tick(30)
    expect(send.calls.length).toBe(1)
    expect(box.items().length).toBe(1) // не потерян
    expect(box.status().state).toBe('error')

    send.setResp({ sent: 'all' })
    await tick(300) // подождать первый backoff (200ms) + время на flush
    expect(send.calls.length).toBeGreaterThanOrEqual(2)
    expect(box.items().length).toBe(0)
    expect(box.status().state).toBe('ok')
    box.destroy()
  })

  test('per-item cap: после maxItemAttempts дропается', async () => {
    const send = makeSend()
    send.setResp({ throw: new Error('network down') })
    const box = createOutbox({
      send,
      storage: memoryStorage(),
      debounceMs: 5,
      baseDelayMs: 5,
      maxDelayMs: 5,
      maxItemAttempts: 3,
    })
    box.enqueue([it1])
    await tick(200) // хватит на 3+ попытки при baseDelayMs=5
    expect(box.items().length).toBe(0) // выкинут
    box.destroy()
  })
})

describe('outbox: перманентные ошибки (dropped из send)', () => {
  test('dropped элементы не остаются в очереди', async () => {
    const send = makeSend()
    send.setResp({ sent: [], dropped: [it1] })
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.enqueue([it1])
    await tick(30)
    expect(box.items().length).toBe(0)
    box.destroy()
  })
})

describe('outbox: persist и restore', () => {
  test('restore поднимает очередь из storage', async () => {
    const storage = memoryStorage()
    await storage.setItem('sklad.outbox', JSON.stringify({ v: 1, items: [it1, it2] }))

    const send = makeSend()
    send.setResp({ throw: new Error('offline') }) // не позволяем отправить
    const box = createOutbox({ send, storage, debounceMs: 5, baseDelayMs: 5000 })
    await box.restore()
    expect(box.items().length).toBe(2)
    box.destroy()
  })

  test('после успешного flush storage очищается', async () => {
    const storage = memoryStorage()
    const send = makeSend()
    const box = createOutbox({ send, storage, debounceMs: 5 })
    box.enqueue([it1])
    await tick(30)
    const raw = await storage.getItem('sklad.outbox')
    expect(raw).toBeNull()
    box.destroy()
  })

  test('после сбоя storage содержит очередь', async () => {
    const storage = memoryStorage()
    const send = makeSend()
    send.setResp({ throw: new Error('offline') })
    const box = createOutbox({ send, storage, debounceMs: 5, baseDelayMs: 500 })
    box.enqueue([it1, it2])
    await tick(30)
    const raw = await storage.getItem('sklad.outbox')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw)
    expect(parsed.items.length).toBe(2)
    box.destroy()
  })

  test('повреждённый JSON — стартуем с пустой очередью, не крашимся', async () => {
    const storage = memoryStorage()
    await storage.setItem('sklad.outbox', '{ битый json')
    const send = makeSend()
    const box = createOutbox({ send, storage })
    await box.restore()
    expect(box.items().length).toBe(0)
    box.destroy()
  })
})

describe('outbox: onChange', () => {
  test('подписчик получает состояния при переходах', async () => {
    const send = makeSend()
    const states = []
    const box = createOutbox({ send, storage: memoryStorage(), debounceMs: 5 })
    box.onChange((s) => states.push(s.state))
    box.enqueue([it1])
    await tick(30)
    // ok (стартовое), pending (после enqueue), syncing (во flush), ok (после)
    expect(states).toContain('pending')
    expect(states).toContain('ok')
    box.destroy()
  })
})
