// ──────────────────────────────────────────────────────────────────────────
//  Облачный слой: загрузка/заливка данных в Supabase + автосинхронизация +
//  авторизация. Активен только если задан Supabase (hasSupabase).
//  Стор остаётся локальным кэшем (быстро, оффлайн), а изменения уходят в БД.
//
//  Исходящий синк идёт через персистентный outbox (lib/outbox.js):
//  - изменения переживают перезапуск приложения и оффлайн;
//  - при сетевом сбое ретраятся с экспоненциальным бэкоффом;
//  - перманентные ошибки (отсутствует таблица, RLS, constraint) дропаются
//    без бесконечного цикла.
// ──────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'
import { createOutbox } from './outbox'
import { TABLES, byKey, toRow, fromRow } from './tables'
import { applyPendingToData } from './merge'

// Таблица ещё не создана в БД (новая фича до применения SQL) — не валим приложение
const isMissingTable = (e) => {
  const m = `${e?.message || ''} ${e?.code || ''}`
  return /PGRST205|42P01|does not exist|find the table|schema cache/i.test(m)
}

// Загрузить все таблицы из БД. Возвращает объект для стора или null, если пусто.
export async function cloudLoadAll() {
  const result = {}
  let total = 0
  await Promise.all(
    TABLES.map(async (cfg) => {
      const { data, error } = await supabase.from(cfg.table).select('*')
      if (error) {
        if (isMissingTable(error)) {
          console.warn('cloudLoad: таблица отсутствует, пропуск', cfg.table)
          result[cfg.key] = []
          return
        }
        throw error
      }
      result[cfg.key] = (data || []).map((r) => fromRow(r, cfg))
      total += result[cfg.key].length
    }),
  )
  return total > 0 ? result : null
}

// Загрузка с учётом неотправленного. Сначала пытаемся дослать очередь; если
// не удалось (офлайн) — накладываем pending поверх серверных данных через
// applyPendingToData (см. lib/merge.js), чтобы bootstrap не затирал
// ещё не улетевшие правки.
export async function cloudLoadMerged() {
  await outbox.flushNow().catch(() => {})
  const data = await cloudLoadAll()
  const pending = outbox.items()
  if (data && pending.length) applyPendingToData(data, pending)
  return data
}

// Реэкспорт applyPendingToData оставлен для обратной совместимости с внешними
// импортерами (если они были).
export { applyPendingToData } from './merge'

// Сделать id seed-записей уникальными для компании (иначе фиксированные id
// вроде pt_retail / wh1 / A1 конфликтуют между тенантами по первичному ключу).
// Префиксуем id и все ссылки на них; коды ячеек (cell) остаются как есть.
export function remapSeedForCompany(state, companyId) {
  const p = companyId.slice(0, 8) + '_'
  const rid = (id) => (id ? p + id : id)
  const remapItems = (items) =>
    (items || []).map((it) => ({ ...it, productId: rid(it.productId) }))
  return {
    ...state,
    priceTypes: state.priceTypes.map((t) => ({ ...t, id: rid(t.id) })),
    warehouses: state.warehouses.map((w) => ({ ...w, id: rid(w.id) })),
    cells: state.cells.map((c) => ({ ...c, id: rid(c.id), warehouseId: rid(c.warehouseId) })),
    products: state.products.map((pr) => ({
      ...pr,
      id: rid(pr.id),
      warehouseId: rid(pr.warehouseId),
      prices: Object.fromEntries(
        Object.entries(pr.prices || {}).map(([k, v]) => [rid(k), v]),
      ),
    })),
    customers: state.customers.map((c) => ({ ...c, id: rid(c.id), priceTypeId: rid(c.priceTypeId) })),
    suppliers: state.suppliers.map((s) => ({ ...s, id: rid(s.id) })),
    employees: state.employees.map((e) => ({ ...e, id: rid(e.id) })),
    orders: state.orders.map((o) => ({
      ...o,
      id: rid(o.id),
      customerId: rid(o.customerId),
      priceTypeId: rid(o.priceTypeId),
      assignedTo: rid(o.assignedTo),
      items: remapItems(o.items),
    })),
    invoices: state.invoices.map((i) => ({
      ...i,
      id: rid(i.id),
      partyId: rid(i.partyId),
      priceTypeId: rid(i.priceTypeId),
      items: remapItems(i.items),
    })),
    documents: (state.documents || []).map((d) => ({
      ...d,
      id: rid(d.id),
      toWarehouseId: rid(d.toWarehouseId),
      items: remapItems(d.items),
    })),
    movements: state.movements.map((m) => ({ ...m, id: rid(m.id), productId: rid(m.productId) })),
    shifts: state.shifts.map((s) => ({ ...s, id: rid(s.id) })),
    audit: state.audit.map((a) => ({ ...a, id: rid(a.id) })),
  }
}

// Явно записать одну сущность в БД (autosync стартует позже и пропустил бы её)
export async function cloudUpsert(storeKey, obj, companyId) {
  const cfg = TABLES.find((t) => t.key === storeKey)
  if (!cfg) return
  const { error } = await supabase.from(cfg.table).upsert({ ...toRow(obj, cfg), company_id: companyId })
  if (error) throw error
}

// Залить начальное состояние (seed) в БД, пометив записи компанией
export async function cloudSeed(state, companyId) {
  for (const cfg of TABLES) {
    const rows = (state[cfg.key] || []).map((o) => ({ ...toRow(o, cfg), company_id: companyId }))
    if (!rows.length) continue
    const { error } = await supabase.from(cfg.table).upsert(rows)
    if (error) {
      if (isMissingTable(error)) {
        console.warn('cloudSeed: таблица отсутствует, пропуск', cfg.table)
        continue
      }
      throw error
    }
  }
}

// ── Автосинхронизация через персистентный outbox ────────────────────────────
const snap = (state) =>
  Object.fromEntries(
    TABLES.map((t) => [
      t.key,
      new Map((state[t.key] || []).map((o) => [o.id, o])),
    ]),
  )

// Перманентная ошибка — ретрай не поможет. Такой элемент outbox дропает
// без бесконечного цикла. Логируем, чтобы не терялось тихо.
// - PGRST205 / 42P01 — таблицы нет (миграция не применена).
// - 42501 — RLS запрещает (компания/роль не совпадают).
// - 23xxx — constraint (unique, not-null, fk) — данные битые, ретрай не спасёт.
function isPermanentError(e) {
  const code = e?.code || ''
  const msg = e?.message || ''
  if (/^PGRST205$|^42P01$|^42501$/.test(code)) return true
  if (/^23\d{3}$/.test(code)) return true
  if (/does not exist|schema cache|violates row-level security/i.test(msg)) return true
  return false
}

// Транспорт для outbox: сгруппировать батч по таблицам и выполнить upsert/delete.
// Возвращает { sent, dropped, error? }.
async function sendBatch(batch) {
  const sent = []
  const dropped = []
  let firstError = null

  // Группируем по (key, op). В пределах группы порядок вставки не важен —
  // конфликты по PK разруливает supabase.upsert.
  const groups = new Map()
  for (const it of batch) {
    const gk = `${it.key}|${it.op}`
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk).push(it)
  }

  for (const [, group] of groups) {
    const key = group[0].key
    const op = group[0].op
    const cfg = byKey[key]
    if (!cfg) {
      // неизвестная таблица — не наш случай, дропаем, чтобы не крутить вечно
      dropped.push(...group)
      continue
    }
    try {
      if (op === 'upsert') {
        const rows = group.map((it) => it.row)
        const { error } = await supabase.from(cfg.table).upsert(rows)
        if (error) throw error
      } else {
        const ids = group.map((it) => it.id)
        const { error } = await supabase.from(cfg.table).delete().in('id', ids)
        if (error) throw error
      }
      sent.push(...group)
    } catch (e) {
      if (isPermanentError(e)) {
        console.warn(`outbox: перманентная ошибка на ${cfg.table} (${op}) — сброс ${group.length} записей:`, e?.message || e)
        dropped.push(...group)
      } else if (!firstError) {
        firstError = e
      }
    }
  }
  return { sent, dropped, error: firstError }
}

const outbox = createOutbox({ send: sendBatch })

// Публичные хуки — startup вызывает restore+flush; UI может подписаться на статус.
export async function initOutboxSync() {
  await outbox.restore()
  outbox.flushNow()
}
export const outboxStatus = () => outbox.status()
export const onOutboxChange = (cb) => outbox.onChange(cb)
export const flushOutbox = () => outbox.flushNow()

let attached = false
export function attachSync(useStore) {
  if (attached) return
  attached = true
  let prev = snap(useStore.getState())
  useStore.subscribe((state) => {
    const companyId = state.companyId
    if (!companyId) return // без компании не синхронизируем
    const batch = []
    // Один timestamp на всю пачку — batch пришёл из одного set(), логично помечать
    // все правки одним моментом.
    const nowIso = new Date().toISOString()
    for (const cfg of TABLES) {
      const next = new Map((state[cfg.key] || []).map((o) => [o.id, o]))
      const old = prev[cfg.key]
      // новые / изменённые
      for (const [id, obj] of next) {
        const before = old.get(id)
        if (!before || before !== obj) {
          batch.push({
            op: 'upsert',
            key: cfg.key,
            id,
            // updated_at нужен для конфликтов: при bootstrap merge локальное
            // побеждает только если оно свежее серверного. Серверный триггер
            // (см. supabase/updated_at.sql) дополнительно отклоняет stale upsert.
            row: { ...toRow(obj, cfg), company_id: companyId, updated_at: nowIso },
          })
        }
      }
      // удалённые
      for (const id of old.keys()) {
        if (!next.has(id)) batch.push({ op: 'delete', key: cfg.key, id })
      }
    }
    if (batch.length) outbox.enqueue(batch)
    prev = snap(state)
  })
}

// ── Компании (тенанты) ───────────────────────────────────────────────────────
// Текущее членство пользователя: { company_id, role, name, companies:{name} } | null
export async function getMembership() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('memberships')
    .select('company_id, role, name, companies(name, plan)')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

// Онбординг: создать компанию + членство атомарно через серверную RPC
// (обходит гонку RLS: select компании до появления членства).
export async function createCompanyCloud(companyName, userName) {
  const { data, error } = await supabase.rpc('create_company', {
    p_name: companyName,
    p_user_name: userName || null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, companyId: data }
}

// Принять приглашение (если пользователь приглашён в компанию) → company_id | null
export async function acceptInvitation() {
  const { data, error } = await supabase.rpc('accept_invitation')
  if (error) return null
  return data
}

// ── Команда: участники и приглашения ─────────────────────────────────────────
export async function loadMembers() {
  const { data } = await supabase
    .from('memberships')
    .select('user_id, role, name, active, created_at')
  return data || []
}
export async function loadInvites() {
  const { data } = await supabase.from('invitations').select('id, email, role, name, created_at')
  return data || []
}
export async function inviteMember(companyId, email, role, name) {
  const { error } = await supabase.from('invitations').insert({
    company_id: companyId,
    email: email.trim().toLowerCase(),
    role,
    name: name || null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
export async function revokeInvite(id) {
  await supabase.from('invitations').delete().eq('id', id)
}
export async function updateMemberRole(userId, companyId, role) {
  await supabase.from('memberships').update({ role }).eq('user_id', userId).eq('company_id', companyId)
}
export async function removeMember(userId, companyId) {
  await supabase.from('memberships').delete().eq('user_id', userId).eq('company_id', companyId)
}

// ── Пароль ───────────────────────────────────────────────────────────────────
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, error: ruAuthError(error.message) }
  return { ok: true }
}
export async function requestPasswordReset(email) {
  // ссылка сброса ведёт на веб-версию (там экран ввода нового пароля)
  const redirectTo = 'https://yakub-cyber.github.io/skladpro/'
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) return { ok: false, error: ruAuthError(error.message) }
  return { ok: true }
}

// На мобильном recovery-ссылка открывается в вебе; deep-link обработка — позже.
export async function checkRecovery() {
  return false
}

// Сохранить FCM-токен устройства для push (этап 2 — Firebase)
export async function savePushToken(token, companyId) {
  if (!token) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('push_tokens')
    .upsert({ token, user_id: user.id, company_id: companyId, platform: 'android', updated_at: new Date().toISOString() }, { onConflict: 'token' })
}

// ── Realtime: изменения заказов своей компании → уведомления ─────────────────
export function subscribeOrders(companyId, onChange) {
  if (!companyId) return () => {}
  const ch = supabase
    .channel(`orders-rt-${companyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `company_id=eq.${companyId}` },
      (payload) => onChange(payload),
    )
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// ── Авторизация (Supabase Auth, email + пароль) ──────────────────────────────
export async function getCloudSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Подписка на события авторизации. Передаём event, чтобы отличить выход.
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session))
  return () => data.subscription.unsubscribe()
}

export async function cloudSignIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) return { ok: false, error: ruAuthError(error.message) }
  return { ok: true }
}

export async function cloudSignUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
  if (error) return { ok: false, error: ruAuthError(error.message) }
  // если в Supabase включено подтверждение email — сессии сразу нет
  if (!data.session) return { ok: true, needConfirm: true }
  return { ok: true, user: data.user, name }
}

export async function cloudSignOut() {
  await supabase.auth.signOut()
}

function ruAuthError(m = '') {
  const s = m.toLowerCase()
  if (s.includes('invalid login')) return 'Неверный email или пароль'
  if (s.includes('already registered')) return 'Этот email уже зарегистрирован'
  if (s.includes('password')) return 'Пароль слишком короткий (мин. 6 символов)'
  if (s.includes('email')) return 'Некорректный email'
  return m
}
