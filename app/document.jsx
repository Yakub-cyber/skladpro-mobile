import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, Search, Plus, Minus, Check } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Input, Btn, Empty, C } from '../components/ui'
import { num, money } from '../lib/format'
import { catInfo } from '../lib/constants'

const TYPES = {
  purchase: { title: 'Закупка / приход', verb: 'Оприходовать', color: C.ok },
  writeoff: { title: 'Списание', verb: 'Списать', color: C.bad },
  sale_return: { title: 'Возврат продажи', verb: 'Принять возврат', color: C.info },
  purchase_return: { title: 'Возврат поставщику', verb: 'Оформить возврат', color: C.warn },
  inventory: { title: 'Инвентаризация', verb: 'Применить пересчёт', color: C.brand, count: true },
}

export default function DocumentScreen() {
  const params = useLocalSearchParams()
  const type = TYPES[params.type] ? params.type : 'purchase'
  const t = TYPES[type]
  const products = useStore((s) => s.products)
  const receiveOp = useStore((s) => s.receiveOp)
  const writeOff = useStore((s) => s.writeOff)
  const returnStock = useStore((s) => s.returnStock)
  const applyInventory = useStore((s) => s.applyInventory)

  const [q, setQ] = useState('')
  const [qty, setQty] = useState({}) // productId -> число

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
  }, [products, q])

  const setVal = (id, v) => setQty((m) => { const x = { ...m }; if (v <= 0 && !t.count) delete x[id]; else x[id] = v; return x })
  const add = (p) => setVal(p.id, (qty[p.id] ?? (t.count ? p.stock : 0)) + 1)
  const dec = (p) => setVal(p.id, Math.max(0, (qty[p.id] ?? (t.count ? p.stock : 0)) - 1))

  const picked = Object.keys(qty).length
  const apply = () => {
    const entries = Object.entries(qty)
    if (!entries.length) return
    if (type === 'purchase') {
      receiveOp(entries.map(([id, n]) => { const p = products.find((x) => x.id === id); return { productId: id, name: p.name, qty: n } }), 'Закупка (моб.)')
    } else if (type === 'writeoff') {
      entries.forEach(([id, n]) => writeOff(id, n, 'Списание (моб.)'))
    } else if (type === 'sale_return') {
      entries.forEach(([id, n]) => returnStock(id, n, 'Возврат продажи'))
    } else if (type === 'purchase_return') {
      entries.forEach(([id, n]) => writeOff(id, n, 'Возврат поставщику'))
    } else if (type === 'inventory') {
      const counts = {}
      entries.forEach(([id, n]) => { counts[id] = n })
      applyInventory(counts)
    }
    Alert.alert('Готово', `${t.title}: ${picked} позиций`, [{ text: 'OK', onPress: () => router.back() }])
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">{t.title}</Text>
      </View>

      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск товара…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
        {t.count && <Text className="text-muted text-[12px] mt-2">Укажите фактический остаток по каждой позиции</Text>}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: picked ? 100 : 24 }}>
        {list.length === 0 && <Empty title="Ничего не найдено" icon={Search} />}
        {list.map((p) => {
          const ci = catInfo(p.category)
          const has = p.id in qty
          const val = has ? qty[p.id] : (t.count ? p.stock : 0)
          return (
            <View key={p.id} className="flex-row items-center py-3 border-b border-line">
              <View className="w-1 h-9 rounded mr-3" style={{ backgroundColor: ci.color }} />
              <View className="flex-1 pr-2">
                <Text className="text-ink text-[14px]" numberOfLines={1}>{p.name}</Text>
                <Text className="text-muted text-[12px] mt-0.5">{t.count ? `на складе ${num(p.stock)} ${p.unit}` : `${num(p.stock)} ${p.unit} · ${money(p.price)}`}</Text>
              </View>
              {has || t.count ? (
                <View className="flex-row items-center">
                  <Pressable onPress={() => dec(p)} className="h-9 w-9 rounded-lg bg-surface-2 items-center justify-center active:opacity-70">
                    <Minus size={16} color={C.ink} />
                  </Pressable>
                  <Text className="text-ink font-semibold w-10 text-center">{num(val)}</Text>
                  <Pressable onPress={() => add(p)} className="h-9 w-9 rounded-lg items-center justify-center active:opacity-70" style={{ backgroundColor: t.color }}>
                    <Plus size={16} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => add(p)} className="h-9 w-9 rounded-lg bg-surface-2 items-center justify-center active:opacity-70">
                  <Plus size={18} color={t.color} />
                </Pressable>
              )}
            </View>
          )
        })}
      </ScrollView>

      {picked > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7">
          <Btn title={`${t.verb} · ${picked} поз.`} icon={Check} size="lg" onPress={apply} style={{ backgroundColor: t.color }} />
        </View>
      )}
    </Screen>
  )
}
