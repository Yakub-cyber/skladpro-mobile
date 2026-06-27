import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Search, ChevronRight, Wrench, Hammer, Zap, Droplets, PaintBucket, Package } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Input, Badge, Empty, C } from '../../components/ui'
import { money, num } from '../../lib/format'
import { CATEGORIES, catInfo } from '../../lib/constants'

const CAT_ICON = { Wrench, Hammer, Zap, Droplets, PaintBucket, Package }
const stockTone = (p) => (p.stock <= p.minStock ? C.bad : p.stock <= p.minStock * 1.5 ? C.warn : C.ok)

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

  const totalValue = products.reduce((a, p) => a + p.stock * p.cost, 0)
  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]

  return (
    <Screen>
      <View className="px-4 pt-3 pb-1">
        <Text className="text-ink text-xl font-bold">Товары</Text>
        <Text className="text-muted text-[13px] mb-3">{products.length} SKU · склад на {money(totalValue)}</Text>
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск по названию, артикулу…" className="flex-1 h-11 px-2 bg-transparent border-0" />
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
        <Card className="overflow-hidden">
          {list.map((p, i) => {
            const ci = catInfo(p.category)
            const Icon = CAT_ICON[ci.icon] || Package
            const stColor = stockTone(p)
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/product/${p.id}`)}
                className={`flex-row items-center px-3.5 py-3 active:bg-surface-2 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <View className="h-9 w-9 rounded-lg items-center justify-center" style={{ backgroundColor: ci.color + '22' }}>
                  <Icon size={17} color={ci.color} />
                </View>
                <View className="flex-1 ml-3 pr-2">
                  <Text className="text-ink font-medium text-[14px]" numberOfLines={1}>{p.name}</Text>
                  <Text className="text-muted text-[12px] mt-0.5">{p.sku}</Text>
                </View>
                <View className="items-end mr-1.5">
                  <Text className="text-ink text-[14px] font-medium">{money(p.price)}</Text>
                  <Text className="text-[12px] font-medium" style={{ color: stColor }}>{num(p.stock)} {p.unit}</Text>
                </View>
                <ChevronRight size={16} color={C.muted} />
              </Pressable>
            )
          })}
        </Card>
      </ScrollView>
    </Screen>
  )
}
