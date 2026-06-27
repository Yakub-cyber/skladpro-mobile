import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Search, AlertTriangle, ChevronRight } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Input, Badge, Empty, C } from '../../components/ui'
import { money, num } from '../../lib/format'
import { CATEGORIES, catInfo } from '../../lib/constants'

export default function Products() {
  const products = useStore((s) => s.products)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)),
    )
  }, [products, q, cat])

  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]

  return (
    <Screen>
      <View className="px-4 pt-3 pb-1">
        <Text className="text-ink text-xl font-bold mb-3">Товары</Text>
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск товара…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
      </View>

      {/* Категории */}
      <View className="h-12">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {chips.map((c) => {
            const on = cat === c.key
            return (
              <Pressable
                key={c.key}
                onPress={() => setCat(c.key)}
                className="px-3.5 h-9 rounded-full items-center justify-center flex-row"
                style={{ backgroundColor: on ? c.color : C.surface2, borderWidth: 1, borderColor: on ? c.color : C.line }}
              >
                {c.key !== 'all' && <View className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: on ? '#fff' : c.color }} />}
                <Text className="text-[13px] font-medium" style={{ color: on ? '#fff' : C.muted }}>{c.name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 24 }}>
        {list.length === 0 && <Empty title="Ничего не найдено" icon={Search} />}
        {list.map((p) => {
          const low = p.stock <= p.minStock
          const ci = catInfo(p.category)
          return (
            <Pressable key={p.id} onPress={() => router.push(`/product/${p.id}`)} className="active:opacity-90">
              <Card className="mb-2 flex-row items-center overflow-hidden">
                <View className="w-1.5 self-stretch" style={{ backgroundColor: ci.color }} />
                <View className="flex-1 py-3 pl-3 pr-2">
                  <Text className="text-ink font-medium text-[14px]" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-muted text-[12px] mt-0.5">{p.sku} · {money(p.price)}</Text>
                </View>
                <View className="items-end pr-2">
                  <View className="flex-row items-center">
                    {low && <AlertTriangle size={13} color={C.warn} />}
                    <Text className={`font-semibold text-[14px] ml-1 ${low ? 'text-warn' : 'text-ink'}`}>
                      {num(p.stock)} {p.unit}
                    </Text>
                  </View>
                  {low ? <Badge color={C.warn}>мало</Badge> : null}
                </View>
                <ChevronRight size={16} color={C.muted} style={{ marginRight: 8 }} />
              </Card>
            </Pressable>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
