import { useState, useMemo } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { Search, AlertTriangle } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Input, Badge, Empty, C } from '../../components/ui'
import { money, num } from '../../lib/format'

export default function Products() {
  const products = useStore((s) => s.products)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
  }, [products, q])

  return (
    <Screen>
      <View className="px-4 pt-3 pb-2">
        <Text className="text-ink text-xl font-bold mb-3">Товары</Text>
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input
            value={q}
            onChangeText={setQ}
            placeholder="Поиск товара…"
            className="flex-1 h-11 px-2 bg-transparent border-0"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, paddingBottom: 24 }}>
        {list.length === 0 && <Empty title="Ничего не найдено" icon={Search} />}
        {list.map((p) => {
          const low = p.stock <= p.minStock
          return (
            <Card key={p.id} className="p-3.5 mb-2 flex-row items-center">
              <View className="flex-1 pr-2">
                <Text className="text-ink font-medium text-[14px]" numberOfLines={1}>{p.name}</Text>
                <Text className="text-muted text-[12px] mt-0.5">{p.sku} · {money(p.price)}</Text>
              </View>
              <View className="items-end">
                <View className="flex-row items-center">
                  {low && <AlertTriangle size={13} color={C.warn} />}
                  <Text className={`font-semibold text-[14px] ml-1 ${low ? 'text-warn' : 'text-ink'}`}>
                    {num(p.stock)} {p.unit}
                  </Text>
                </View>
                {low && <Badge color={C.warn}>мало</Badge>}
              </View>
            </Card>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
