import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, Flag, ScanLine } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, C, tone } from '../../components/ui'
import { money } from '../../lib/format'
import { statusInfo, nextStatus } from '../../lib/constants'

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'picking', label: 'Сборка' },
  { key: 'shipped', label: 'В пути' },
  { key: 'delivered', label: 'Доставлены' },
]

export default function Orders() {
  const allOrders = useStore((s) => s.orders)
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const advanceOrder = useStore((s) => s.advanceOrder)
  const [filter, setFilter] = useState('all')

  const me = employees.find((e) => e.id === authUserId)
  const isCourier = me?.role === 'courier'

  const mine = useMemo(
    () => (isCourier ? allOrders.filter((o) => o.assignedTo === authUserId) : allOrders),
    [allOrders, isCourier, authUserId],
  )
  const inProcess = mine.filter((o) => ['new', 'confirmed', 'picking'].includes(o.status)).length

  const orders = useMemo(() => {
    let list = mine
    if (filter === 'new') list = list.filter((o) => ['new', 'confirmed'].includes(o.status))
    else if (filter === 'picking') list = list.filter((o) => o.status === 'picking')
    else if (filter === 'shipped') list = list.filter((o) => ['packed', 'shipped'].includes(o.status))
    else if (filter === 'delivered') list = list.filter((o) => o.status === 'delivered')
    return [...list].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  }, [mine, filter])

  return (
    <Screen>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-ink text-xl font-bold">Заказы</Text>
        <Text className="text-muted text-[13px] mb-3">{mine.length} всего · {inProcess} в обработке</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3.5 h-8 rounded-lg items-center justify-center ${filter === f.key ? 'bg-brand' : 'bg-surface-2'}`}
            >
              <Text className={`text-[13px] font-medium ${filter === f.key ? 'text-brand-ink' : 'text-muted'}`}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 24 }}>
        {orders.length === 0 && <Empty title="Заказов нет" text={isCourier ? 'Вам пока не назначены заказы' : 'Список пуст'} />}
        {orders.map((o) => {
          const si = statusInfo(o.status)
          const nx = nextStatus(o.status)
          const nxInfo = nx && statusInfo(nx)
          return (
            <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} className="active:opacity-90">
              <Card className="p-4 mb-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    {o.priority && <Flag size={13} color={C.bad} />}
                    <Text className="text-ink font-semibold text-[15px] ml-1">{o.no}</Text>
                  </View>
                  <Badge color={tone(si.color)}>{si.label}</Badge>
                </View>
                <Text className="text-ink text-[14px] mt-1.5" numberOfLines={1}>{o.customerName}</Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-muted text-[12px]" numberOfLines={1}>{o.address}</Text>
                  <Text className="text-ink font-semibold">{money(o.total)}</Text>
                </View>
                {nx && o.status !== 'cancelled' && (
                  <Pressable
                    onPress={() => advanceOrder(o.id)}
                    className="flex-row items-center justify-center mt-3 h-10 rounded-xl bg-surface-2 active:opacity-80"
                  >
                    <Text className="text-brand font-semibold text-[14px]">В статус «{nxInfo.label}»</Text>
                    <ChevronRight size={16} color={C.brand} />
                  </Pressable>
                )}
              </Card>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Касса — быстрая продажа (не для курьера) */}
      {!isCourier && (
        <Pressable
          onPress={() => router.push('/pos')}
          className="absolute bottom-5 right-5 h-14 px-5 rounded-2xl bg-brand flex-row items-center active:opacity-80"
          style={{ shadowColor: C.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <ScanLine size={20} color="#fff" />
          <Text className="text-white font-semibold ml-2">Касса</Text>
        </Pressable>
      )}
    </Screen>
  )
}
