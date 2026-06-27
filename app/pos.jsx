import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Search, ScanLine, Plus, Minus, Check } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Card, Input, Empty, Btn, C } from '../components/ui'
import { money, num } from '../lib/format'
import Scanner from '../components/Scanner'

export default function Pos() {
  const products = useStore((s) => s.products)
  const addOrder = useStore((s) => s.addOrder)
  const [q, setQ] = useState('')
  const [cart, setCart] = useState({}) // productId -> qty
  const [scanOpen, setScanOpen] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
  }, [products, q])

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1
      const next = { ...c }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })

  const onScan = (code) => {
    const p = products.find((x) => x.barcode === code || x.sku === code)
    setScanOpen(false)
    if (p) add(p.id)
    else Alert.alert('Не найдено', `Товар со штрихкодом ${code} не найден`)
  }

  const items = Object.entries(cart).map(([id, qty]) => {
    const p = products.find((x) => x.id === id)
    return p ? { productId: id, name: p.name, qty, price: p.price, unit: p.unit, cell: p.cell } : null
  }).filter(Boolean)
  const total = items.reduce((a, it) => a + it.qty * it.price, 0)
  const count = items.reduce((a, it) => a + it.qty, 0)

  const checkout = () => {
    if (!items.length) return
    addOrder({ customerId: 'retail', customerName: 'Розничный покупатель', items, total, courier: 'Самовывоз', address: '—' })
    setCart({})
    Alert.alert('Продажа проведена', `Чек на ${money(total)} оформлен`, [{ text: 'OK', onPress: () => router.back() }])
  }

  return (
    <Screen>
      {/* Шапка */}
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Касса</Text>
      </View>

      {/* Поиск + сканер */}
      <View className="flex-row items-center gap-2 px-4 py-3">
        <View className="flex-1 flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск товара…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
        <Pressable onPress={() => setScanOpen(true)} className="h-11 w-11 rounded-xl bg-brand items-center justify-center active:opacity-80">
          <ScanLine size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Каталог */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: items.length ? 120 : 24 }}>
        {list.length === 0 && <Empty title="Ничего не найдено" icon={Search} />}
        {list.map((p) => {
          const qty = cart[p.id] || 0
          return (
            <Card key={p.id} className="p-3 mb-2 flex-row items-center">
              <View className="flex-1 pr-2">
                <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{p.name}</Text>
                <Text className="text-muted text-[12px] mt-0.5">{money(p.price)} · {num(p.stock)} {p.unit}</Text>
              </View>
              {qty > 0 ? (
                <View className="flex-row items-center">
                  <Pressable onPress={() => dec(p.id)} className="h-9 w-9 rounded-lg bg-surface-2 items-center justify-center active:opacity-70">
                    <Minus size={16} color={C.ink} />
                  </Pressable>
                  <Text className="text-ink font-semibold w-8 text-center">{qty}</Text>
                  <Pressable onPress={() => add(p.id)} className="h-9 w-9 rounded-lg bg-brand items-center justify-center active:opacity-70">
                    <Plus size={16} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => add(p.id)} className="h-9 w-9 rounded-lg bg-surface-2 items-center justify-center active:opacity-70">
                  <Plus size={18} color={C.brand} />
                </Pressable>
              )}
            </Card>
          )
        })}
      </ScrollView>

      {/* Нижняя панель чека */}
      {items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-muted text-[13px]">В чеке: {count} шт</Text>
            <Text className="text-ink text-xl font-bold">{money(total)}</Text>
          </View>
          <Btn title="Провести продажу" icon={Check} onPress={checkout} />
        </View>
      )}

      <Scanner visible={scanOpen} onScan={onScan} onClose={() => setScanOpen(false)} />
    </Screen>
  )
}
