import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Wallet, ClipboardList, AlertTriangle, Users, ChevronRight } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Stat, Section, Card, Avatar, Badge, C, tone } from '../../components/ui'
import { AreaChart } from '../../components/Chart'
import { money, num, dateShort } from '../../lib/format'
import { roleInfo, statusInfo, catInfo } from '../../lib/constants'
import { buildSeries } from '../../lib/series'

const PERIODS = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year', label: 'Год' },
]

export default function Dashboard() {
  const products = useStore((s) => s.products)
  const orders = useStore((s) => s.orders)
  const customers = useStore((s) => s.customers)
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const companyName = useStore((s) => s.companyName)
  const me = employees.find((e) => e.id === authUserId)
  const role = roleInfo(me?.role || 'admin')
  const [period, setPeriod] = useState('month')

  const m = useMemo(() => {
    const active = orders.filter((o) => ['new', 'confirmed', 'picking', 'packed', 'shipped'].includes(o.status))
    const valid = orders.filter((o) => o.status !== 'cancelled')
    const revenue = valid.reduce((a, o) => a + o.total, 0)
    const low = products.filter((p) => p.stock <= p.minStock)
    const avg = valid.length ? revenue / valid.length : 0
    const sold = {}
    valid.forEach((o) => (o.items || []).forEach((it) => { sold[it.productId] = (sold[it.productId] || 0) + it.qty }))
    const top = Object.entries(sold)
      .map(([id, q]) => ({ p: products.find((x) => x.id === id), q }))
      .filter((x) => x.p).sort((a, b) => b.q - a.q).slice(0, 5)
    return { active, revenue, low, avg, top, maxQ: top[0]?.q || 1 }
  }, [products, orders])

  const chart = useMemo(() => buildSeries(period, orders), [period, orders])
  const stockValue = products.reduce((a, p) => a + p.stock * p.cost, 0)
  const debt = customers.reduce((a, c) => a + Math.max(0, c.balance || 0), 0)
  const recent = [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 6)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Шапка */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1">
            <Text className="text-muted text-[13px]">{companyName || 'Компания'}</Text>
            <Text className="text-ink text-xl font-bold">Дашборд</Text>
          </View>
          <Pressable onPress={() => router.push('/more')}>
            <Avatar name={me?.name || '?'} color={role.color} size={42} />
          </Pressable>
        </View>

        {/* KPI */}
        <View className="gap-3 mb-4">
          <Stat label="Выручка за месяц" value={money(m.revenue)} icon={Wallet} color={C.brand} trend={chart.trend} />
          <Stat label="Активные заказы" value={num(m.active.length)} sub={`в работе на ${money(m.active.reduce((a, o) => a + o.total, 0))}`} icon={ClipboardList} color={C.info} />
          <Stat label="Ниже минимума" value={num(m.low.length)} sub="требуют закупки" icon={AlertTriangle} color={m.low.length ? C.bad : C.ok} />
          <Stat label="Клиентов" value={num(customers.length)} sub={debt > 0 ? `дебиторка ${money(debt)}` : `средний чек ${money(m.avg)}`} icon={Users} color={debt > 0 ? C.warn : C.ok} />
        </View>

        {/* График выручки */}
        <Section
          title="Выручка"
          subtitle={`${chart.periodLabel} · склад ${money(stockValue)}`}
          className="mb-4"
          action={null}
        >
          {/* Переключатель периодов */}
          <View className="-mt-1 mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PERIODS.map((p) => {
                const on = period === p.key
                return (
                  <Pressable key={p.key} onPress={() => setPeriod(p.key)} className={`px-3 h-8 rounded-lg items-center justify-center ${on ? 'bg-brand' : 'bg-surface-2'}`}>
                    <Text className={`text-[12px] font-medium ${on ? 'text-brand-ink' : 'text-muted'}`}>{p.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
          <AreaChart series={chart.series} height={200} />
        </Section>

        {/* Топ продаж */}
        {m.top.length > 0 && (
          <Section title="Топ продаж" className="mb-4">
            {m.top.map(({ p, q }, i) => {
              const c = catInfo(p.category)
              return (
                <View key={p.id} className={i > 0 ? 'mt-3' : ''}>
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-ink text-[13px] flex-1 mr-2" numberOfLines={1}>{p.name}</Text>
                    <Text className="text-muted text-[12px]">{num(q)} {p.unit}</Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <View className="h-1.5 rounded-full" style={{ width: `${(q / m.maxQ) * 100}%`, backgroundColor: c.color }} />
                  </View>
                </View>
              )
            })}
          </Section>
        )}

        {/* Последние заказы */}
        <Section
          title="Последние заказы"
          action={
            <Pressable onPress={() => router.push('/orders')} className="flex-row items-center">
              <Text className="text-brand text-[13px] font-medium mr-0.5">Все</Text>
              <ChevronRight size={15} color={C.brand} />
            </Pressable>
          }
        >
          <View>
            {recent.map((o, i) => {
              const si = statusInfo(o.status)
              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/order/${o.id}`)}
                  className={`flex-row items-center py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-ink text-[14px]" numberOfLines={1}>{o.customerName}</Text>
                    <Text className="text-muted text-[12px] mt-0.5">{o.no} · {dateShort(o.createdAt)}</Text>
                  </View>
                  <Text className="text-ink text-[13px] font-semibold mr-2">{money(o.total)}</Text>
                  <Badge color={tone(si.color)}>{si.label}</Badge>
                </Pressable>
              )
            })}
          </View>
        </Section>
      </ScrollView>
    </Screen>
  )
}
