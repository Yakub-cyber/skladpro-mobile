import { useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Linking } from 'react-native'
import { MapPin, Navigation as NavIcon, Check } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, C, tone } from '../../components/ui'
import { money } from '../../lib/format'
import { statusInfo } from '../../lib/constants'

const DELIVERABLE = ['confirmed', 'picking', 'packed', 'shipped']

export default function Delivery() {
  const orders = useStore((s) => s.orders)
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const setOrderStatus = useStore((s) => s.setOrderStatus)

  const me = employees.find((e) => e.id === authUserId)
  const isCourier = me?.role === 'courier'

  const list = useMemo(
    () =>
      orders.filter(
        (o) =>
          DELIVERABLE.includes(o.status) &&
          o.courier !== 'Самовывоз' &&
          (!isCourier || o.assignedTo === authUserId),
      ),
    [orders, isCourier, authUserId],
  )

  const openMap = (addr) => {
    const url = `https://yandex.ru/maps/?text=${encodeURIComponent(addr || '')}`
    Linking.openURL(url)
  }

  return (
    <Screen>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-ink text-xl font-bold">Доставка</Text>
        <Text className="text-muted text-[13px] mt-0.5">{list.length} заказов к доставке</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 24 }}>
        {list.length === 0 && <Empty title="Нет заказов к доставке" icon={NavIcon} />}
        {list.map((o) => {
          const si = statusInfo(o.status)
          return (
            <Card key={o.id} className="p-4 mb-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-ink font-semibold text-[15px]">{o.no}</Text>
                <Badge color={tone(si.color)}>{si.label}</Badge>
              </View>
              <Text className="text-ink text-[14px] mt-1.5">{o.customerName}</Text>
              <Pressable onPress={() => openMap(o.address)} className="flex-row items-center mt-1.5">
                <MapPin size={14} color={C.brand} />
                <Text className="text-brand text-[13px] ml-1 flex-1" numberOfLines={1}>{o.address}</Text>
              </Pressable>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-muted text-[13px]">{o.courier}</Text>
                <Text className="text-ink font-semibold">{money(o.total)}</Text>
              </View>
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={() => openMap(o.address)}
                  className="flex-1 flex-row items-center justify-center h-10 rounded-xl bg-surface-2 active:opacity-80"
                >
                  <NavIcon size={16} color={C.brand} />
                  <Text className="text-brand font-semibold text-[14px] ml-1.5">Маршрут</Text>
                </Pressable>
                <Pressable
                  onPress={() => setOrderStatus(o.id, 'delivered')}
                  className="flex-1 flex-row items-center justify-center h-10 rounded-xl bg-ok active:opacity-80"
                >
                  <Check size={16} color="#fff" />
                  <Text className="text-white font-semibold text-[14px] ml-1.5">Доставлен</Text>
                </Pressable>
              </View>
            </Card>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
