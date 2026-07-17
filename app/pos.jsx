import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Plus, Minus, Check, X, Trash2, Wallet } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Input, Btn, C } from '../components/ui'
import { money, num } from '../lib/format'
import { CATEGORIES, catInfo } from '../lib/constants'
import SmartFind from '../components/SmartFind'
import ProductTile from '../components/ProductTile'

export default function Pos() {
  const products = useStore((s) => s.products)
  const addOrder = useStore((s) => s.addOrder)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cart, setCart] = useState({}) // productId -> qty
  const [cartOpen, setCartOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)),
    )
  }, [products, q, cat])

  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1
      const next = { ...c }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })
  const removeFromCart = (id) => setCart((c) => { const next = { ...c }; delete next[id]; return next })

  const onScan = (code) => {
    const p = products.find((x) => x.barcode === code || x.sku === code)
    if (p) add(p.id)
    else Alert.alert('Не найдено', `Товар со штрихкодом ${code} не найден`)
  }

  const items = Object.entries(cart).map(([id, qty]) => {
    const p = products.find((x) => x.id === id)
    return p ? { productId: id, name: p.name, qty, price: p.price, unit: p.unit, cell: p.cell } : null
  }).filter(Boolean)
  const total = items.reduce((a, it) => a + it.qty * it.price, 0)
  const count = items.reduce((a, it) => a + it.qty, 0)

  const checkout = (paid) => {
    addOrder({ customerId: 'retail', customerName: 'Розничный покупатель', items, total, courier: 'Самовывоз', address: '—' })
    setCart({})
    setPayOpen(false)
    setCartOpen(false)
    const change = paid != null ? paid - total : 0
    Alert.alert('Продажа проведена', change > 0 ? `Сдача: ${money(change)}` : `Чек на ${money(total)}`, [{ text: 'OK', onPress: () => router.back() }])
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

      {/* Поиск + сканер (единый SmartFind — общий с document/order-new) */}
      <View className="px-4 py-3">
        <SmartFind value={q} onChangeText={setQ} onScan={onScan} placeholder="Поиск товара…" />
      </View>

      {/* Категории */}
      <View className="h-11">
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

      {/* Сетка плиток товаров */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: count ? 104 : 16 }}>
        <View className="flex-row flex-wrap">
          {list.map((p) => (
            <View key={p.id} className="w-1/2 p-1.5">
              <ProductTile
                product={p}
                qty={cart[p.id] || 0}
                onInc={() => add(p.id)}
                onDec={() => dec(p.id)}
                onRemove={() => removeFromCart(p.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Нижняя панель чека */}
      {count > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7 flex-row items-center gap-3">
          <Pressable onPress={() => setCartOpen(true)} className="flex-1 active:opacity-80">
            <Text className="text-muted text-[12px]">{count} товаров</Text>
            <Text className="text-ink text-xl font-bold">{money(total)}</Text>
          </Pressable>
          <Pressable onPress={() => setPayOpen(true)} className="h-14 px-7 rounded-2xl bg-brand flex-row items-center active:opacity-80">
            <Wallet size={20} color="#fff" />
            <Text className="text-white font-bold text-[16px] ml-2">Оплатить</Text>
          </Pressable>
        </View>
      )}

      {/* Чек (раскрытие) */}
      <CartSheet open={cartOpen} items={items} total={total} onClose={() => setCartOpen(false)} onAdd={add} onDec={dec} onClear={() => { setCart({}); setCartOpen(false) }} onPay={() => { setCartOpen(false); setPayOpen(true) }} />

      {/* Оплата */}
      <PayModal open={payOpen} total={total} onClose={() => setPayOpen(false)} onConfirm={checkout} />

    </Screen>
  )
}

function CartSheet({ open, items, total, onClose, onAdd, onDec, onClear, onPay }) {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '80%' }}>
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-ink text-lg font-bold">Чек</Text>
            <View className="flex-row items-center">
              <Pressable onPress={onClear} className="h-9 px-3 flex-row items-center mr-1">
                <Trash2 size={16} color={C.bad} />
                <Text className="text-bad text-[13px] ml-1">Очистить</Text>
              </Pressable>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
                <X size={22} color={C.muted} />
              </Pressable>
            </View>
          </View>
          <ScrollView className="px-5">
            {items.map((it) => (
              <View key={it.productId} className="flex-row items-center py-2.5 border-b border-line">
                <View className="flex-1 pr-2">
                  <Text className="text-ink text-[14px]" numberOfLines={1}>{it.name}</Text>
                  <Text className="text-muted text-[12px] mt-0.5">{money(it.price)} × {num(it.qty)}</Text>
                </View>
                <View className="flex-row items-center">
                  <Pressable onPress={() => onDec(it.productId)} className="h-9 w-9 rounded-lg bg-surface-2 items-center justify-center active:opacity-70">
                    <Minus size={16} color={C.ink} />
                  </Pressable>
                  <Text className="text-ink font-semibold w-9 text-center">{num(it.qty)}</Text>
                  <Pressable onPress={() => onAdd(it.productId)} className="h-9 w-9 rounded-lg bg-brand items-center justify-center active:opacity-70">
                    <Plus size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-muted">Итого</Text>
              <Text className="text-ink text-xl font-bold">{money(total)}</Text>
            </View>
            <Btn title="Оплатить" icon={Wallet} size="lg" onPress={onPay} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function PayModal({ open, total, onClose, onConfirm }) {
  const [method, setMethod] = useState('cash')
  const [given, setGiven] = useState('')
  const givenN = parseFloat(given.replace(',', '.')) || 0
  const change = method === 'cash' ? Math.max(0, givenN - total) : 0
  const enough = method === 'card' || givenN >= total

  const quick = [total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
    .filter((v, i, a) => a.indexOf(v) === i)

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-bold">Оплата</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-muted">К оплате</Text>
            <Text className="text-ink text-2xl font-bold">{money(total)}</Text>
          </View>

          {/* Способ оплаты */}
          <View className="flex-row bg-surface-2 rounded-xl p-1 mb-4">
            {[['cash', 'Наличные'], ['card', 'Карта']].map(([k, label]) => (
              <Pressable key={k} onPress={() => setMethod(k)} className={`flex-1 h-11 rounded-lg items-center justify-center ${method === k ? 'bg-brand' : ''}`}>
                <Text className={`font-semibold ${method === k ? 'text-brand-ink' : 'text-muted'}`}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {method === 'cash' && (
            <>
              <Text className="text-muted text-[13px] mb-1.5">Получено от покупателя</Text>
              <Input value={given} onChangeText={setGiven} placeholder={String(total)} keyboardType="numeric" className="mb-2 h-12" />
              <View className="flex-row flex-wrap gap-2 mb-3">
                {quick.map((v) => (
                  <Pressable key={v} onPress={() => setGiven(String(v))} className="px-3 h-9 rounded-lg bg-surface-2 items-center justify-center">
                    <Text className="text-ink text-[13px]">{money(v)}</Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center justify-between mb-4 px-1">
                <Text className="text-muted">Сдача</Text>
                <Text className="text-ok text-xl font-bold">{money(change)}</Text>
              </View>
            </>
          )}

          <Btn
            title="Провести продажу"
            icon={Check}
            size="lg"
            disabled={!enough}
            onPress={() => onConfirm(method === 'cash' ? givenN || total : null)}
          />
        </View>
      </View>
    </Modal>
  )
}
