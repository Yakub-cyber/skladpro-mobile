import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Search, ChevronRight, MapPin } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Card, Input, Avatar, Badge, Empty, C } from '../components/ui'
import { money } from '../lib/format'

export default function Customers() {
  const customers = useStore((s) => s.customers)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const arr = customers.filter((c) => !s || c.name.toLowerCase().includes(s) || (c.city || '').toLowerCase().includes(s))
    return arr.sort((a, b) => (b.balance || 0) - (a.balance || 0))
  }, [customers, q])

  const totalDebt = customers.reduce((a, c) => a + Math.max(0, c.balance || 0), 0)

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Клиенты</Text>
      </View>

      <View className="px-4 pt-3 pb-1">
        {totalDebt > 0 && (
          <Card className="p-3.5 mb-3 flex-row items-center justify-between">
            <Text className="text-muted text-[13px]">Общая дебиторка</Text>
            <Text className="text-bad text-lg font-bold">{money(totalDebt)}</Text>
          </Card>
        )}
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск клиента…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 24 }}>
        {list.length === 0 && <Empty title="Клиенты не найдены" icon={Search} />}
        {list.map((c) => {
          const debt = Math.max(0, c.balance || 0)
          return (
            <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}`)} className="active:opacity-90">
              <Card className="p-3.5 mb-2 flex-row items-center">
                <Avatar name={c.name} color={C.info} size={42} />
                <View className="flex-1 ml-3">
                  <Text className="text-ink font-medium text-[14px]" numberOfLines={1}>{c.name}</Text>
                  <View className="flex-row items-center mt-0.5">
                    <MapPin size={11} color={C.muted} />
                    <Text className="text-muted text-[12px] ml-1" numberOfLines={1}>{c.city || '—'}</Text>
                  </View>
                </View>
                {debt > 0 ? (
                  <View className="items-end">
                    <Text className="text-bad font-semibold text-[14px]">{money(debt)}</Text>
                    <Badge color={C.bad}>долг</Badge>
                  </View>
                ) : null}
                <ChevronRight size={16} color={C.muted} style={{ marginLeft: 6 }} />
              </Card>
            </Pressable>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
