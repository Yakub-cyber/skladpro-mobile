// ──────────────────────────────────────────────────────────────────────────
//  Хэширование PIN сотрудника (локально, без выгрузки в облако).
//  Порт с веба (skladpro/src/lib/crypto.js) + адаптация под RN.
//
//  Почему pure-JS SHA-256 (js-sha256), а не globalThis.crypto.subtle:
//   - subtle.digest есть в браузере и Node 20+, но НЕ гарантирован в RN
//     0.85 без нативного полифилла. js-sha256 работает везде без
//     нативных модулей и rebuild.
//   - Пакет ~4 KB, JS-only, MIT.
//
//  Схема: SHA-256(pin + SALT), hex 64 символа. Соль — константа приложения.
//  PIN в облако не выгружается (см. LOCAL_ONLY_EMPLOYEE_FIELDS в cloud.js).
//  Легаси-совместимость: verifyPin принимает и открытый PIN (для seed/демо
//  и карточек до миграции), возвращает флаг legacy для ленивой миграции.
// ──────────────────────────────────────────────────────────────────────────

import { sha256 } from 'js-sha256'

const SALT = 'sklad-pin-v1'

export function hashPin(pin) {
  const raw = String(pin ?? '')
  if (!raw) return ''
  return sha256(raw + SALT)
}

// Хэшированный PIN — ровно 64 hex-символа. Всё остальное трактуем как legacy
// (открытый PIN из seed или старой версии persist).
export function isHashedPin(stored) {
  return typeof stored === 'string' && /^[0-9a-f]{64}$/.test(stored)
}

// Сравнить введённый PIN с сохранённым.
// Возврат: { ok: boolean, legacy?: boolean }
//   ok=true, legacy=true → совпало с открытым legacy-значением, вызывающая
//   сторона должна перезаписать хранимый PIN на hashPin(pin) (ленивая миграция).
export function verifyPin(pin, stored) {
  const raw = String(pin ?? '')
  const s = String(stored ?? '')
  if (!s) return { ok: false }
  if (isHashedPin(s)) {
    return { ok: hashPin(raw) === s }
  }
  return { ok: raw === s, legacy: true }
}
