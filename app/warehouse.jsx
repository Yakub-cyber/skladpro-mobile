import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Modal } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Search, MapPin, X } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { WarehouseMap } from '../components/WarehouseMap'
import { Screen, Card, Input, Badge, Empty, C } from '../components/ui'
import { money, num } from '../lib/format'

export default function Warehouse() {
  const cells = useStore((s) => s.cells)
  const products = useStore((s) => s.products)
  const activeWh = useStore((s) => s.warehouses?.find((w) => w.id === s.activeWarehouseId))
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null) // выбранная ячейка

  // подсветка ячеек найденных товаров
  const highlight = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return products.filter((p) => p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)).map((p) => p.cell)
  }, [products, q])

  const selItems = sel ? products.filter((p) => p.cell === sel.code) : []

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Карта склада</Text>
      </View>

      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Найти товар на карте…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
        {highlight.length > 0 && (
          <Text className="text-brand text-[12px] mt-2">Подсвечено ячеек: {new Set(highlight).size}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ width: 660 }}>
            <WarehouseMap
              cells={cells}
              products={products}
              highlight={highlight}
              selected={sel?.id}
              onCellPress={(c) => setSel(c)}
              workZones={activeWh?.workZones}
            />
          </View>
        </ScrollView>

        {/* Легенда зон */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mt-4 px-1">
          {[['A·B Крепёж', '#f59e0b'], ['C·D Инструмент', '#7c6cff'], ['E Электрика', '#38bdf8'], ['F Сантехника', '#10b981'], ['G ЛКМ', '#f43f5e'], ['H Расходники', '#94a3b8']].map(([l, c]) => (
            <View key={l} className="flex-row items-center">
              <View className="h-2.5 w-2.5 rounded-sm mr-1.5" style={{ backgroundColor: c }} />
              <Text className="text-muted text-[12px]">{l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Детали ячейки */}
      <Modal visible={!!sel} animationType="slide" transparent onRequestClose={() => setSel(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '70%' }}>
            <View className="flex-row items-center justify-between px-5 mb-3">
              <View className="flex-row items-center">
                <MapPin size={18} color={C.brand} />
                <Text className="text-ink text-lg font-bold ml-2">Ячейка {sel?.code}</Text>
              </View>
              <Pressable onPress={() => setSel(null)} className="h-9 w-9 items-center justify-center">
                <X size={22} color={C.muted} />
              </Pressable>
            </View>
            <ScrollView className="px-5">
              {selItems.length === 0 ? (
                <Empty title="Ячейка пуста" />
              ) : (
                selItems.map((p) => {
                  const low = p.stock <= p.minStock
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => { setSel(null); router.push(`/product/${p.id}`) }}
                      className="flex-row items-center py-3 border-b border-line"
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-ink text-[14px]" numberOfLines={1}>{p.name}</Text>
                        <Text className="text-muted text-[12px] mt-0.5">{p.sku} · {money(p.price)}</Text>
                      </View>
                      <Text className="text-[14px] font-medium" style={{ color: low ? C.warn : C.ink }}>{num(p.stock)} {p.unit}</Text>
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
