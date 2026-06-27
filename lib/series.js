// Агрегация выручки по периоду — перенос из веб-версии (Dashboard.jsx)
export function trendOf(series) {
  const h = Math.floor(series.length / 2)
  const first = series.slice(0, h).reduce((a, d) => a + d.v, 0)
  const second = series.slice(h).reduce((a, d) => a + d.v, 0)
  if (first < 1000) return null
  return Math.max(-95, Math.min(99, Math.round(((second - first) / first) * 100)))
}

export function buildSeries(period, orders) {
  const valid = orders.filter((o) => o.status !== 'cancelled')
  const sumIn = (from, to) =>
    valid.reduce((a, o) => {
      const t = new Date(o.createdAt).getTime()
      return t >= from && t < to ? a + o.total : a
    }, 0)
  const now = new Date()
  const DAY = 86400000
  const ddmm = (d) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

  if (period === 'day') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const series = Array.from({ length: 24 }, (_, h) => {
      const from = start.getTime() + h * 3600000
      return { label: `${String(h).padStart(2, '0')}:00`, v: Math.round(sumIn(from, from + 3600000)) }
    })
    return { series, trend: trendOf(series), periodLabel: 'сегодня, по часам' }
  }
  if (period === 'week' || period === 'month') {
    const n = period === 'week' ? 7 : 30
    const d0 = new Date(now)
    d0.setHours(0, 0, 0, 0)
    const series = []
    for (let i = n - 1; i >= 0; i--) {
      const day = new Date(d0)
      day.setDate(day.getDate() - i)
      const from = day.getTime()
      series.push({ label: ddmm(day), v: Math.round(sumIn(from, from + DAY)) })
    }
    return { series, trend: trendOf(series), periodLabel: `${n} дней` }
  }
  if (period === 'quarter') {
    const d0 = new Date(now)
    d0.setHours(0, 0, 0, 0)
    const series = []
    for (let i = 12; i >= 0; i--) {
      const from = d0.getTime() - i * 7 * DAY
      series.push({ label: ddmm(new Date(from)), v: Math.round(sumIn(from, from + 7 * DAY)) })
    }
    return { series, trend: trendOf(series), periodLabel: '13 недель' }
  }
  // year — 12 месяцев
  const series = []
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mNext = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    series.push({
      label: mStart.toLocaleDateString('ru-RU', { month: 'short' }),
      v: Math.round(sumIn(mStart.getTime(), mNext.getTime())),
    })
  }
  return { series, trend: trendOf(series), periodLabel: '12 месяцев' }
}
