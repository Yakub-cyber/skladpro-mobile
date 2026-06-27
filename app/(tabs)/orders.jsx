import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { ChevronRight, Flag } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, C } from '../../components/ui'
import { money } from '../../lib/format'
import { statusInfo, nextStatus } from '../../lib/constants'

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'В работе' },
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

  const orders = useMemo(() => {
    let list = isCourier ? allOrders.filter((o) => o.assignedTo === authUserId) : allOrders
    if (filter === 'active') list = list.filter((o) => ['new', 'confirmed', 'picking', 'packed', 'shipped'].includes(o.status))
    else if (filter === 'delivered') list = list.filter((o) => o.status === 'delivered')
    return [...list].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
  }, [allOrders, filter, isCourier, authUserId])

  return (
    <Screen>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-ink text-xl font-bold mb-3">Заказы</Text>
        <View className="flex-row gap-2">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3 h-8 rounded-lg items-center justify-center ${filter === f.key ? 'bg-brand' : 'bg-surface-2'}`}
            >
              <Text className={`text-[13px] font-medium ${filter === f.key ? 'text-brand-ink' : 'text-muted'}`}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 24 }}>
        {orders.length === 0 && <Empty title="Заказов нет" text={isCourier ? 'Вам пока не назначены заказы' : 'Список пуст'} />}
        {orders.map((o) => {
          const si = statusInfo(o.status)
          const nx = nextStatus(o.status)
          const nxInfo = nx && statusInfo(nx)
          return (
            <Card key={o.id} className="p-4 mb-2.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {o.priority && <Flag size={13} color={C.bad} />}
                  <Text className="text-ink font-semibold text-[15px] ml-1">{o.no}</Text>
                </View>
                <Badge color={si.color}>{si.label}</Badge>
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
          )
        })}
      </ScrollView>
    </Screen>
  )
}
