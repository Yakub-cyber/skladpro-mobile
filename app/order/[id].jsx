import { View, Text, ScrollView, Pressable } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, ChevronRight, MapPin, Truck, Check, X, Flag } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, Btn, C, tone } from '../../components/ui'
import { money, num, dateTime } from '../../lib/format'
import { statusInfo, nextStatus, TRACK_FLOW } from '../../lib/constants'

export default function OrderDetail() {
  const { id } = useLocalSearchParams()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const advanceOrder = useStore((s) => s.advanceOrder)
  const cancelOrder = useStore((s) => s.cancelOrder)

  if (!order) {
    return (
      <Screen>
        <Header title="Заказ" />
        <Empty title="Заказ не найден" />
      </Screen>
    )
  }

  const si = statusInfo(order.status)
  const nx = nextStatus(order.status)
  const nxInfo = nx && statusInfo(nx)
  const cancelled = order.status === 'cancelled'

  return (
    <Screen>
      <Header title={order.no} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Шапка-статус */}
        <Card className="p-4 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {order.priority && <Flag size={15} color={C.bad} />}
              <Text className="text-ink text-lg font-bold ml-1">{order.customerName}</Text>
            </View>
            <Badge color={tone(si.color)}>{si.label}</Badge>
          </View>
          <Text className="text-muted text-[12px] mt-1">{dateTime(order.createdAt)}</Text>

          {/* Прогресс статусов */}
          {!cancelled && (
            <View className="flex-row mt-4">
              {TRACK_FLOW.map((s, i) => {
                const done = s.step <= si.step
                return (
                  <View key={s.key} className="flex-1 items-center">
                    <View
                      className="h-7 w-7 rounded-full items-center justify-center"
                      style={{ backgroundColor: done ? C.brand : C.surface3 }}
                    >
                      {done ? <Check size={13} color="#fff" /> : <Text className="text-muted text-[11px]">{i + 1}</Text>}
                    </View>
                    <Text className="text-[9px] text-muted mt-1" numberOfLines={1}>{s.label}</Text>
                  </View>
                )
              })}
            </View>
          )}
        </Card>

        {/* Действия */}
        {!cancelled && (
          <View className="mb-3">
            {nx && (
              <Btn
                title={`В статус «${nxInfo.label}»`}
                icon={ChevronRight}
                onPress={() => advanceOrder(order.id)}
                className="mb-2"
              />
            )}
            {order.status !== 'delivered' && (
              <Btn title="Отменить заказ" variant="soft" icon={X} onPress={() => cancelOrder(order.id)} />
            )}
          </View>
        )}

        {/* Адрес и доставка */}
        <Card className="p-4 mb-3">
          <View className="flex-row items-center mb-2">
            <Truck size={15} color={C.muted} />
            <Text className="text-ink text-[14px] ml-2">{order.courier || '—'}</Text>
          </View>
          <View className="flex-row items-center">
            <MapPin size={15} color={C.muted} />
            <Text className="text-ink text-[14px] ml-2 flex-1">{order.address || '—'}</Text>
          </View>
        </Card>

        {/* Состав */}
        <Text className="text-ink font-semibold mb-2 px-1">Состав · {order.items.length}</Text>
        <Card className="overflow-hidden mb-3">
          {order.items.map((it, i) => (
            <View key={i} className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <View className="flex-1 pr-2">
                <Text className="text-ink text-[14px]" numberOfLines={1}>{it.name}</Text>
                <Text className="text-muted text-[12px] mt-0.5">
                  {num(it.qty)} {it.unit} × {money(it.price)}
                </Text>
              </View>
              <Text className="text-ink font-semibold">{money(it.qty * it.price)}</Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between px-4 py-3 border-t border-line">
            <Text className="text-muted">Итого</Text>
            <Text className="text-ink text-lg font-bold">{money(order.total)}</Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Header({ title }) {
  return (
    <View className="flex-row items-center px-3 h-12 border-b border-line">
      <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
        <ChevronLeft size={24} color={C.ink} />
      </Pressable>
      <Text className="text-ink text-lg font-semibold ml-1">{title}</Text>
    </View>
  )
}
