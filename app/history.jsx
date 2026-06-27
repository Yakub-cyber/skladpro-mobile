import { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, ChevronRight } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Card, Badge, Empty, C, tone } from '../components/ui'
import { money, num, dateTime } from '../lib/format'
import { statusInfo } from '../lib/constants'

const MV = {
  in: { label: 'Приёмка', color: C.ok, icon: ArrowDownToLine },
  writeoff: { label: 'Списание', color: C.bad, icon: ArrowUpFromLine },
  return: { label: 'Возврат', color: C.info, icon: ArrowDownToLine },
  inventory: { label: 'Инвентаризация', color: C.warn, icon: ClipboardCheck },
}

export default function History() {
  const orders = useStore((s) => s.orders)
  const movements = useStore((s) => s.movements) || []
  const [tab, setTab] = useState('sales')

  const sales = [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">История</Text>
      </View>

      {/* Вкладки */}
      <View className="flex-row bg-surface-2 rounded-xl p-1 mx-4 my-3">
        {[['sales', 'Продажи'], ['stock', 'Склад']].map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} className={`flex-1 h-9 rounded-lg items-center justify-center ${tab === k ? 'bg-brand' : ''}`}>
            <Text className={`text-[14px] font-semibold ${tab === k ? 'text-brand-ink' : 'text-muted'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {tab === 'sales' ? (
          sales.length === 0 ? <Empty title="Продаж нет" /> : sales.map((o) => {
            const si = statusInfo(o.status)
            return (
              <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} className="active:opacity-90">
                <Card className="p-3.5 mb-2 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{o.customerName}</Text>
                    <Text className="text-muted text-[12px] mt-0.5">{o.no} · {dateTime(o.createdAt)}</Text>
                  </View>
                  <View className="items-end mr-1.5">
                    <Text className="text-ink font-semibold">{money(o.total)}</Text>
                    <Badge color={tone(si.color)}>{si.label}</Badge>
                  </View>
                  <ChevronRight size={16} color={C.muted} />
                </Card>
              </Pressable>
            )
          })
        ) : (
          movements.length === 0 ? <Empty title="Операций нет" /> : movements.map((m) => {
            const info = MV[m.type] || MV.inventory
            return (
              <Card key={m.id} className="p-3.5 mb-2 flex-row items-center">
                <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: info.color + '22' }}>
                  <info.icon size={18} color={info.color} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{m.name}</Text>
                  <Text className="text-muted text-[12px] mt-0.5">{info.label} · {dateTime(m.at)}</Text>
                </View>
                <Text className="font-semibold" style={{ color: (m.delta || 0) >= 0 ? C.ok : C.bad }}>
                  {(m.delta || 0) >= 0 ? '+' : ''}{num(m.delta || 0)}
                </Text>
              </Card>
            )
          })
        )}
      </ScrollView>
    </Screen>
  )
}
