import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, ChevronRight, MapPin, Truck, Check, X, Flag, Pencil, Route as RouteIcon } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { WarehouseMap } from '../../components/WarehouseMap'
import EditOrderModal from '../../components/EditOrderModal'
import { Screen, Card, Badge, Empty, Btn, C, tone } from '../../components/ui'
import { money, num, dateTime } from '../../lib/format'
import { statusInfo, nextStatus, TRACK_FLOW, canAccess, roleInfo } from '../../lib/constants'
import { buildPickRoute } from '../../lib/ai'

export default function OrderDetail() {
  const { id } = useLocalSearchParams()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const cells = useStore((s) => s.cells)
  const products = useStore((s) => s.products)
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const advanceOrder = useStore((s) => s.advanceOrder)
  const cancelOrder = useStore((s) => s.cancelOrder)
  const updateOrder = useStore((s) => s.updateOrder)
  const [editOpen, setEditOpen] = useState(false)

  const me = employees.find((e) => e.id === authUserId)
  const canPick = canAccess(me?.role, 'warehouse')

  // маршрут сборки по ячейкам позиций
  const pick = useMemo(() => {
    if (!order) return { order: [], distance: 0, cells: [] }
    const pts = order.items
      .map((it) => {
        const c = cells.find((x) => x.code === it.cell)
        return c ? { x: c.x, y: c.y, code: it.cell, name: it.name, qty: it.qty, unit: it.unit } : null
      })
      .filter(Boolean)
    const r = buildPickRoute(pts)
    return { ...r, cells: pts.map((p) => p.code) }
  }, [order, cells])

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
  // Правка возможна пока заказ не отгружен и не отменён (см. гард в updateOrder).
  const canEdit = !order.stockConsumed && !cancelled

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
            {canEdit && (
              <Btn title="Изменить заказ" variant="soft" icon={Pencil} onPress={() => setEditOpen(true)} className="mb-2" />
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
                  {it.cell ? `${it.cell} · ` : ''}{num(it.qty)} {it.unit} × {money(it.price)}
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

        {/* EditOrderModal сам делает return null пока invisible — можно
            монтировать без ленивого guard. onSave возвращает результат
            updateOrder, чтобы модалка показала ошибку и не закрывалась. */}
        <EditOrderModal
          visible={editOpen}
          order={order}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => updateOrder(order.id, patch)}
        />

        {/* Маршрут сборки по складу (для склада/менеджера) */}
        {canPick && pick.cells.length > 0 && (
          <>
            <View className="flex-row items-center mb-2 px-1">
              <RouteIcon size={16} color={C.brand} />
              <Text className="text-ink font-semibold ml-2">Маршрут сборки</Text>
              <Text className="text-muted text-[12px] ml-auto">~{pick.distance} м</Text>
            </View>
            <Card className="p-3 mb-3">
              <View className="mb-3">
                <WarehouseMap cells={cells} products={products} highlight={pick.cells} />
              </View>
              {pick.order.map((c, i) => (
                <View key={i} className={`flex-row items-center py-2 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <View className="h-6 w-6 rounded-full bg-brand items-center justify-center mr-3">
                    <Text className="text-white text-[11px] font-bold">{i + 1}</Text>
                  </View>
                  <Badge color={C.brand}>{c.code}</Badge>
                  <Text className="text-ink text-[13px] ml-2 flex-1" numberOfLines={1}>{c.name}</Text>
                  <Text className="text-muted text-[12px]">{num(c.qty)} {c.unit}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
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
