// Агрегация выручки по периоду — перенос из веб-версии (Dashboard.jsx).
// buildSeries(period, orders, costMap?) → { series, trend, periodLabel, totals }
// - series/trend/periodLabel — как раньше, для графика выручки.
// - totals — { revenue, cost, profit, avg, count } по всем ордерам, попавшим
//   в границы периода. Cost считается через costMap = { productId → cost },
//   что позволяет мини-статам «Себест/Прибыль/Средний чек» жить рядом с
//   основным AreaChart (recharts на RN нет — full multi-series график
//   без ощутимого затрат не потянуть).
export function trendOf(series) {
  const h = Math.floor(series.length / 2)
  const first = series.slice(0, h).reduce((a, d) => a + d.v, 0)
  const second = series.slice(h).reduce((a, d) => a + d.v, 0)
  if (first < 1000) return null
  return Math.max(-95, Math.min(99, Math.round(((second - first) / first) * 100)))
}

// Границы периода — для totals. Считаем «свежий» период тем же диапазоном,
// что покрывает график (см. ниже — сегодня / N дней / 13 недель / 12 месяцев).
function periodBounds(period) {
  const now = new Date()
  const DAY = 86400000
  if (period === 'day') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    return { from: s.getTime(), to: s.getTime() + DAY }
  }
  if (period === 'week' || period === 'month') {
    const n = period === 'week' ? 7 : 30
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0)
    const from = d0.getTime() - (n - 1) * DAY
    return { from, to: d0.getTime() + DAY }
  }
  if (period === 'quarter') {
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0)
    return { from: d0.getTime() - 12 * 7 * DAY, to: d0.getTime() + DAY }
  }
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime()
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()
  return { from, to }
}

function computeTotals(period, orders, costMap = {}) {
  const { from, to } = periodBounds(period)
  const inRange = orders.filter((o) => {
    if (o.status === 'cancelled') return false
    const t = new Date(o.createdAt).getTime()
    return t >= from && t < to
  })
  const revenue = inRange.reduce((a, o) => a + (Number(o.total) || 0), 0)
  const cost = inRange.reduce((a, o) => {
    for (const it of o.items || []) {
      a += (Number(it.qty) || 0) * (Number(costMap[it.productId]) || 0)
    }
    return a
  }, 0)
  const count = inRange.length
  return {
    revenue: Math.round(revenue),
    cost: Math.round(cost),
    profit: Math.round(revenue - cost),
    avg: count ? Math.round(revenue / count) : 0,
    count,
  }
}

export function buildSeries(period, orders, costMap = {}) {
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
    return { series, trend: trendOf(series), periodLabel: 'сегодня, по часам', totals: computeTotals(period, orders, costMap) }
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
    return { series, trend: trendOf(series), periodLabel: `${n} дней`, totals: computeTotals(period, orders, costMap) }
  }
  if (period === 'quarter') {
    const d0 = new Date(now)
    d0.setHours(0, 0, 0, 0)
    const series = []
    for (let i = 12; i >= 0; i--) {
      const from = d0.getTime() - i * 7 * DAY
      series.push({ label: ddmm(new Date(from)), v: Math.round(sumIn(from, from + 7 * DAY)) })
    }
    return { series, trend: trendOf(series), periodLabel: '13 недель', totals: computeTotals(period, orders, costMap) }
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
  return { series, trend: trendOf(series), periodLabel: '12 месяцев', totals: computeTotals(period, orders, costMap) }
}
