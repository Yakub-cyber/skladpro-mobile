// Soft-обёртка над Sentry. Пакет @sentry/react-native подключается лениво:
// если не установлен — тихо падаем в console.error, приложение не ломается.
// Активируется, только если задан EXPO_PUBLIC_SENTRY_DSN.
//
// Как включить:
//   1) npx expo install @sentry/react-native
//   2) В .env: EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
//   3) В .env: EXPO_PUBLIC_SENTRY_ENV=production (или staging)
//   4) Пересобрать приложение (Sentry требует нативной интеграции для symbolication).
//
// Дальше captureException(e, extra) сам полетит в Sentry. Без DSN — только console.

let Sentry = null
let inited = false

function tryLoadSentry() {
  if (Sentry) return Sentry
  try {
    Sentry = require('@sentry/react-native')
    return Sentry
  } catch {
    return null
  }
}

export function initCrashReporter() {
  if (inited) return
  inited = true
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) return
  const s = tryLoadSentry()
  if (!s?.init) return
  try {
    s.init({
      dsn,
      environment: process.env.EXPO_PUBLIC_SENTRY_ENV || 'production',
      // Sample rates по умолчанию: полные ошибки, 10% транзакций (perf).
      tracesSampleRate: 0.1,
      // Не собираем PII (email, ip) — соответствует нашей PRIVACY.md.
      sendDefaultPii: false,
    })
  } catch (e) {
    console.warn('Sentry init failed:', e?.message || e)
  }
}

export function captureException(error, extra) {
  const s = tryLoadSentry()
  if (s?.captureException) {
    try {
      s.captureException(error, { extra })
      return
    } catch (e) {
      console.warn('Sentry capture failed:', e?.message || e)
    }
  }
  console.error('crash:', error, extra || '')
}

export function captureMessage(msg, level = 'info', extra) {
  const s = tryLoadSentry()
  if (s?.captureMessage) {
    try {
      s.captureMessage(msg, { level, extra })
      return
    } catch {
      /* fallthrough */
    }
  }
  console.log(`[${level}]`, msg, extra || '')
}
