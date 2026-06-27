import { useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, TrendingUp, ShoppingCart, Receipt } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Card, C } from '../components/ui'
import { money } from '../lib/format'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function Metric({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex-1 p-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-muted text-[12px]" numberOfLines={1}>{label}</Text>
        <Icon size={15} color={color} />
      </View>
      <Text className="text-ink text-[15px] font-bold" numberOfLines={1}>{value}</Text>
    </Card>
  )
}

export default function Analytics() {
  const orders = useStore((s) => s.orders)
  const sold = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders])

  const revenue = sold.reduce((a, o) => a + (o.total || 0), 0)
  const avg = sold.length ? revenue / sold.length : 0

  // Выручка по 6 последним месяцам
  const series = useMemo(() => {
    const map = {}
    sold.forEach((o) => {
      const d = new Date(o.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      map[key] = (map[key] || 0) + (o.total || 0)
    })
    const keys = Object.keys(map).sort()
    return keys.slice(-6).map((k) => {
      const [, m] = k.split('-')
      return { label: MONTHS[+m], value: map[k] }
    })
  }, [sold])
  const maxV = Math.max(1, ...series.map((s) => s.value))

  // Топ-5 товаров по выручке
  const top = useMemo(() => {
    const map = {}
    sold.forEach((o) => (o.items || []).forEach((it) => {
      map[it.name] = (map[it.name] || 0) + it.qty * it.price
    }))
    return Object.entries(map).map(([name, sum]) => ({ name, sum })).sort((a, b) => b.sum - a.sum).slice(0, 5)
  }, [sold])
  const maxT = Math.max(1, ...top.map((t) => t.sum))

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Аналитика</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Метрики */}
        <View className="flex-row gap-3 mb-3">
          <Metric icon={TrendingUp} label="Выручка" value={money(revenue)} color={C.ok} />
          <Metric icon={ShoppingCart} label="Продаж" value={sold.length} color={C.brand} />
        </View>
        <View className="mb-5">
          <Metric icon={Receipt} label="Средний чек" value={money(avg)} color={C.info} />
        </View>

        {/* График выручки по месяцам */}
        <Text className="text-ink font-semibold mb-3">Выручка по месяцам</Text>
        <Card className="p-4 mb-5">
          {series.length === 0 ? (
            <Text className="text-muted text-center py-6">Нет данных</Text>
          ) : (
            <View className="flex-row items-end justify-between" style={{ height: 140 }}>
              {series.map((s, i) => (
                <View key={i} className="flex-1 items-center justify-end mx-1">
                  <Text className="text-muted text-[10px] mb-1" numberOfLines={1}>{Math.round(s.value / 1000)}к</Text>
                  <View className="w-full rounded-t-lg" style={{ height: Math.max(4, (s.value / maxV) * 100), backgroundColor: C.brand }} />
                  <Text className="text-muted text-[11px] mt-1.5">{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Топ товаров */}
        <Text className="text-ink font-semibold mb-3">Топ товаров</Text>
        <Card className="p-4">
          {top.length === 0 ? (
            <Text className="text-muted text-center py-6">Нет данных</Text>
          ) : (
            top.map((t, i) => (
              <View key={t.name} className={i > 0 ? 'mt-3' : ''}>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-ink text-[13px] flex-1 mr-2" numberOfLines={1}>{t.name}</Text>
                  <Text className="text-muted text-[12px]">{money(t.sum)}</Text>
                </View>
                <View className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <View className="h-2 rounded-full" style={{ width: `${(t.sum / maxT) * 100}%`, backgroundColor: C.ok }} />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}
