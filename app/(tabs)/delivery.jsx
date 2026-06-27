import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Linking } from 'react-native'
import { MapPin, Navigation as NavIcon, Check, Route as RouteIcon, X, Circle, CheckCircle2 } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, Btn, C, tone } from '../../components/ui'
import { money } from '../../lib/format'
import { statusInfo } from '../../lib/constants'
import { geoLatLng, buildDeliveryRoute, DEPOT, fmtDuration } from '../../lib/geo'

const DELIVERABLE = ['confirmed', 'picking', 'packed', 'shipped']

export default function Delivery() {
  const orders = useStore((s) => s.orders)
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const setOrderStatus = useStore((s) => s.setOrderStatus)
  const [sel, setSel] = useState(() => new Set())
  const [routeOpen, setRouteOpen] = useState(false)

  const me = employees.find((e) => e.id === authUserId)
  const isCourier = me?.role === 'courier'

  const list = useMemo(
    () =>
      orders.filter(
        (o) => DELIVERABLE.includes(o.status) && o.courier !== 'Самовывоз' && (!isCourier || o.assignedTo === authUserId),
      ),
    [orders, isCourier, authUserId],
  )

  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const selectedOrders = list.filter((o) => sel.has(o.id))
  const route = useMemo(() => buildDeliveryRoute(selectedOrders.map((o) => geoLatLng(o))), [selectedOrders])
  const ordered = route.order.map((i) => selectedOrders[i])

  const openMap = (addr) => Linking.openURL(`https://yandex.ru/maps/?text=${encodeURIComponent(addr || '')}`)
  const openRouteMap = () => {
    const pts = [DEPOT, ...ordered.map((o) => geoLatLng(o)), DEPOT]
    const rtext = pts.map((p) => `${p.lat},${p.lng}`).join('~')
    Linking.openURL(`https://yandex.ru/maps/?rtext=${rtext}&rtt=auto`)
  }

  return (
    <Screen>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-ink text-xl font-bold">Доставка</Text>
        <Text className="text-muted text-[13px] mt-0.5">{list.length} к доставке{sel.size > 0 ? ` · выбрано ${sel.size}` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: sel.size ? 110 : 24 }}>
        {list.length === 0 && <Empty title="Нет заказов к доставке" icon={NavIcon} />}
        {list.map((o) => {
          const si = statusInfo(o.status)
          const on = sel.has(o.id)
          return (
            <Card key={o.id} className="p-4 mb-2.5">
              <Pressable onPress={() => toggle(o.id)} className="flex-row items-start">
                <View className="mr-3 mt-0.5">
                  {on ? <CheckCircle2 size={22} color={C.brand} /> : <Circle size={22} color={C.muted} />}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-ink font-semibold text-[15px]">{o.no}</Text>
                    <Badge color={tone(si.color)}>{si.label}</Badge>
                  </View>
                  <Text className="text-ink text-[14px] mt-1">{o.customerName}</Text>
                  <Pressable onPress={() => openMap(o.address)} className="flex-row items-center mt-1">
                    <MapPin size={13} color={C.brand} />
                    <Text className="text-brand text-[13px] ml-1 flex-1" numberOfLines={1}>{o.address}</Text>
                  </Pressable>
                </View>
              </Pressable>
              <View className="flex-row gap-2 mt-3">
                <Pressable onPress={() => openMap(o.address)} className="flex-1 flex-row items-center justify-center h-10 rounded-xl bg-surface-2 active:opacity-80">
                  <NavIcon size={16} color={C.brand} />
                  <Text className="text-brand font-semibold text-[14px] ml-1.5">На карте</Text>
                </Pressable>
                <Pressable onPress={() => setOrderStatus(o.id, 'delivered')} className="flex-1 flex-row items-center justify-center h-10 rounded-xl bg-ok active:opacity-80">
                  <Check size={16} color="#fff" />
                  <Text className="text-white font-semibold text-[14px] ml-1.5">Доставлен</Text>
                </Pressable>
              </View>
            </Card>
          )
        })}
      </ScrollView>

      {/* Панель маршрута */}
      {sel.size > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-muted text-[12px]">Маршрут · {sel.size} точек</Text>
            <Text className="text-ink text-[16px] font-bold">~{route.distanceKm} км · {fmtDuration(route.minutes)}</Text>
          </View>
          <Pressable onPress={() => setRouteOpen(true)} className="h-12 px-5 rounded-xl bg-brand flex-row items-center active:opacity-80">
            <RouteIcon size={18} color="#fff" />
            <Text className="text-white font-bold text-[15px] ml-2">Маршрут</Text>
          </Pressable>
        </View>
      )}

      {/* Маршрутный лист */}
      <Modal visible={routeOpen} animationType="slide" transparent onRequestClose={() => setRouteOpen(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between px-5 mb-1">
              <Text className="text-ink text-lg font-bold">Маршрут объезда</Text>
              <Pressable onPress={() => setRouteOpen(false)} className="h-9 w-9 items-center justify-center">
                <X size={22} color={C.muted} />
              </Pressable>
            </View>
            <Text className="text-muted text-[13px] px-5 mb-3">~{route.distanceKm} км · {fmtDuration(route.minutes)} · старт со склада</Text>
            <ScrollView className="px-5">
              {ordered.map((o, i) => (
                <View key={o.id} className="flex-row items-center py-2.5 border-b border-line">
                  <View className="h-7 w-7 rounded-full bg-brand items-center justify-center mr-3">
                    <Text className="text-white text-[12px] font-bold">{i + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-ink text-[14px]" numberOfLines={1}>{o.customerName}</Text>
                    <Text className="text-muted text-[12px]" numberOfLines={1}>{o.address}</Text>
                  </View>
                  <Text className="text-muted text-[13px]">{money(o.total)}</Text>
                </View>
              ))}
            </ScrollView>
            <View className="px-5 pt-4">
              <Btn title="Открыть маршрут в Яндекс.Картах" icon={NavIcon} size="lg" onPress={openRouteMap} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
