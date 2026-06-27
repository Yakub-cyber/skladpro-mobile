import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Modal } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, MapPin, Phone, Wallet, ChevronRight, X, Check } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Avatar, Badge, Empty, Btn, Input, Field, C, tone } from '../../components/ui'
import { money } from '../../lib/format'
import { statusInfo } from '../../lib/constants'

export default function CustomerDetail() {
  const { id } = useLocalSearchParams()
  const customer = useStore((s) => s.customers.find((c) => c.id === id))
  const allOrders = useStore((s) => s.orders)
  const orders = useMemo(() => allOrders.filter((o) => o.customerId === id), [allOrders, id])
  const addPayment = useStore((s) => s.addPayment)
  const [payOpen, setPayOpen] = useState(false)

  const debt = Math.max(0, customer?.balance || 0)
  const totalBought = useMemo(
    () => orders.filter((o) => o.status === 'delivered').reduce((a, o) => a + (o.total || 0), 0),
    [orders],
  )

  if (!customer) {
    return (
      <Screen>
        <Header title="Клиент" />
        <Empty title="Клиент не найден" />
      </Screen>
    )
  }

  return (
    <Screen>
      <Header title={customer.name} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card className="p-5 mb-3 items-center">
          <Avatar name={customer.name} color={C.info} size={64} />
          <Text className="text-ink text-lg font-bold mt-3 text-center">{customer.name}</Text>
          <View className="flex-row items-center mt-1.5">
            <MapPin size={13} color={C.muted} />
            <Text className="text-muted text-[13px] ml-1">{customer.city || '—'}</Text>
          </View>
          {customer.phone ? (
            <View className="flex-row items-center mt-1">
              <Phone size={13} color={C.muted} />
              <Text className="text-muted text-[13px] ml-1">{customer.phone}</Text>
            </View>
          ) : null}
        </Card>

        <View className="flex-row gap-3 mb-3">
          <Card className="flex-1 p-4">
            <Text className="text-muted text-[12px] mb-1">Куплено</Text>
            <Text className="text-ink text-lg font-bold">{money(totalBought)}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Text className="text-muted text-[12px] mb-1">Долг</Text>
            <Text className={`text-lg font-bold ${debt > 0 ? 'text-bad' : 'text-ink'}`}>{money(debt)}</Text>
          </Card>
        </View>

        {debt > 0 && (
          <View className="mb-4">
            <Btn title="Принять оплату" icon={Wallet} onPress={() => setPayOpen(true)} />
          </View>
        )}

        <Text className="text-ink font-semibold mb-2.5">Заказы · {orders.length}</Text>
        {orders.length === 0 ? (
          <Card><Empty title="Заказов нет" /></Card>
        ) : (
          [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).map((o) => {
            const si = statusInfo(o.status)
            return (
              <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} className="active:opacity-90">
                <Card className="p-3.5 mb-2 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-ink text-[14px] font-medium">{o.no}</Text>
                    <View className="mt-1"><Badge color={tone(si.color)}>{si.label}</Badge></View>
                  </View>
                  <Text className="text-ink font-semibold mr-1.5">{money(o.total)}</Text>
                  <ChevronRight size={16} color={C.muted} />
                </Card>
              </Pressable>
            )
          })
        )}
      </ScrollView>

      <PayModal open={payOpen} debt={debt} onClose={() => setPayOpen(false)} onPay={(amt) => { addPayment(id, amt); setPayOpen(false) }} />
    </Screen>
  )
}

function PayModal({ open, debt, onClose, onPay }) {
  const [amt, setAmt] = useState('')
  const submit = () => {
    const n = parseFloat(amt.replace(',', '.'))
    if (!n || n <= 0) return
    onPay(Math.min(n, debt))
    setAmt('')
  }
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-bold">Оплата долга</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <Text className="text-muted text-[13px] mb-3">Текущий долг: {money(debt)}</Text>
          <Field label="Сумма оплаты">
            <Input value={amt} onChangeText={setAmt} placeholder="0" keyboardType="numeric" autoFocus />
          </Field>
          <Pressable onPress={() => setAmt(String(debt))} className="mb-2">
            <Text className="text-brand text-[13px]">Погасить полностью ({money(debt)})</Text>
          </Pressable>
          <Btn title="Принять оплату" icon={Check} onPress={submit} className="mt-2" />
        </View>
      </View>
    </Modal>
  )
}

function Header({ title }) {
  return (
    <View className="flex-row items-center px-3 h-12 border-b border-line">
      <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
        <ChevronLeft size={24} color={C.ink} />
      </Pressable>
      <Text className="text-ink text-lg font-semibold ml-1" numberOfLines={1}>{title}</Text>
    </View>
  )
}
