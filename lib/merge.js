// @ts-check
// Merge локальных pending-правок из outbox в серверный снапшот при bootstrap.
// Вынесено из cloud.js для юнит-тестов без supabase-js.

import { byKey, fromRow } from './tables'

/** @typedef {import('../types/domain').OutboxItem} OutboxItem */

const parseTs = (v) => {
  const t = Date.parse(v || '')
  return Number.isNaN(t) ? -Infinity : t
}

// Локальное побеждает, только если оно свежее серверного. Без меток обеих
// сторон — прежняя семантика: локальное поверх (страховка на переход, когда
// SQL-миграция updated_at ещё не применена).
export const localWins = (localObj, serverObj) => {
  const p = localObj?.updatedAt
  const s = serverObj?.updatedAt
  if (!p || !s) return true
  return parseTs(p) >= parseTs(s)
}

/**
 * Накладывает pending-элементы outbox поверх server data. Мутирует data.
 *
 * @param {Record<string, any[]>} data — server snapshot (arrays per table key)
 * @param {OutboxItem[]} pending — items() из outbox
 * @returns {Record<string, any[]>}
 */
export function applyPendingToData(data, pending) {
  for (const it of pending) {
    const cfg = byKey[it.key]
    if (!cfg) continue
    const arr = data[it.key]
    if (!Array.isArray(arr)) continue
    const i = arr.findIndex((r) => r.id === it.id)
    if (it.op === 'delete') {
      // Удаление всегда применяем: реверта нет, а outbox дошлёт до сервера.
      if (i >= 0) arr.splice(i, 1)
    } else {
      // fromRow восстанавливает camelCase-объект из snake_case-row.
      const localObj = fromRow(it.row, cfg)
      if (i >= 0) {
        if (localWins(localObj, arr[i])) arr[i] = localObj
      } else {
        arr.push(localObj)
      }
    }
  }
  return data
}
