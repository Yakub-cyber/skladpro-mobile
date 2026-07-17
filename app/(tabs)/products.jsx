import { useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native'
import { router } from 'expo-router'
import { Search, ChevronRight, Wrench, Hammer, Zap, Droplets, PaintBucket, Package, SlidersHorizontal, Upload } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Input, Empty, C } from '../../components/ui'
import { money, num } from '../../lib/format'
import { CATEGORIES, catInfo } from '../../lib/constants'
import { reservedByProduct } from '../../lib/orders'
import FiltersSheet, { EMPTY_FILTERS, activeFiltersCount, applyProductFilters } from '../../components/FiltersSheet'

const CAT_ICON = { Wrench, Hammer, Zap, Droplets, PaintBucket, Package }
const stockTone = (p) => (p.stock <= p.minStock ? C.bad : p.stock <= p.minStock * 1.5 ? C.warn : C.ok)

export default function Products() {
  const products = useStore((s) => s.products)
  const orders = useStore((s) => s.orders)
  const reserved = useMemo(() => reservedByProduct(orders), [orders])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterCount = activeFiltersCount(filters)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    // Порядок: категория/текст (дёшево, фильтрует основную массу) →
    // числовые фильтры (диапазоны цены/остатка/признаков).
    const base = products.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)),
    )
    return filterCount ? applyProductFilters(base, filters) : base
  }, [products, q, cat, filters, filterCount])

  const totalValue = products.reduce((a, p) => a + p.stock * p.cost, 0)
  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]

  // Заголовок вынесен в ListHeaderComponent, чтобы поиск и чипы прокручивались
  // вместе со списком (а не «прилипали» сверху при виртуализации FlatList).
  const Header = (
    <View>
      <View className="px-4 pt-3 pb-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-ink text-xl font-bold">Товары</Text>
          <Pressable onPress={() => router.push('/import-products')} className="flex-row items-center h-8 px-3 rounded-full bg-surface-2 border border-line active:opacity-80">
            <Upload size={14} color={C.brand} />
            <Text className="text-brand text-[12px] font-medium ml-1.5">Импорт</Text>
          </Pressable>
        </View>
        <Text className="text-muted text-[13px] mb-3">{products.length} SKU · склад на {money(totalValue)}</Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
            <Search size={16} color={C.muted} />
            <Input value={q} onChangeText={setQ} placeholder="Поиск по названию, артикулу…" className="flex-1 h-11 px-2 bg-transparent border-0" />
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            className="h-11 px-3 rounded-xl bg-surface-2 border border-line flex-row items-center active:opacity-80"
            style={filterCount > 0 ? { borderColor: C.brand } : undefined}
          >
            <SlidersHorizontal size={16} color={filterCount > 0 ? C.brand : C.muted} />
            {filterCount > 0 && (
              <View className="ml-1.5 h-5 min-w-5 px-1 rounded-full items-center justify-center" style={{ backgroundColor: C.brand }}>
                <Text className="text-white text-[11px] font-bold">{filterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
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
      {/* Обёртка карточки списка — рисуем скруглённый верх, а низ закроет footer. */}
      <View className="mx-4 mt-2 bg-surface border border-line rounded-t-2xl overflow-hidden" style={{ height: 1, marginBottom: -1 }} />
    </View>
  )

  const Footer = (
    <View className="mx-4 mb-6 bg-surface border-x border-b border-line rounded-b-2xl" style={{ height: 8 }} />
  )

  // Вынесенный renderItem — стабильная ссылка + мемоизация ускоряют FlatList
  // на больших каталогах (без пересоздания функции на каждый ререндер).
  const renderRow = useCallback(({ item: p, index }) => {
    const ci = catInfo(p.category)
    const Icon = CAT_ICON[ci.icon] || Package
    const stColor = stockTone(p)
    return (
      <Pressable
        onPress={() => router.push(`/product/${p.id}`)}
        className={`mx-4 bg-surface border-x border-line flex-row items-center px-3.5 py-3 active:bg-surface-2 ${index > 0 ? 'border-t' : ''}`}
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
          {reserved[p.id] > 0 && (
            <Text className="text-[11px] text-warn mt-0.5" numberOfLines={1}>
              резерв {num(reserved[p.id])} · дост. {num(p.stock - reserved[p.id])}
            </Text>
          )}
        </View>
        <ChevronRight size={16} color={C.muted} />
      </Pressable>
    )
  }, [reserved])

  return (
    <Screen>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        renderItem={renderRow}
        ListHeaderComponent={Header}
        ListFooterComponent={list.length > 0 ? Footer : null}
        ListEmptyComponent={<View className="px-4 mt-8"><Empty title="Ничего не найдено" icon={Search} /></View>}
        initialNumToRender={20}
        windowSize={7}
        maxToRenderPerBatch={20}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      />
      <FiltersSheet
        visible={filtersOpen}
        value={filters}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
      />
    </Screen>
  )
}
