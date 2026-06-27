import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Search, Plus, Minus, ShoppingCart, Check, X, Truck } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Input, Field, Btn, Empty, C } from '../components/ui'
import { money, num } from '../lib/format'
import { CATEGORIES, catInfo, priceFor } from '../lib/constants'

export default function Storefront() {
  const { products, priceTypes, addOrder, addCustomer } = useStore()
  const defType = priceTypes.find((t) => t.default)?.id || priceTypes[0]?.id
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cart, setCart] = useState({})
  const [checkout, setCheckout] = useState(false)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter(
      (p) => p.stock > 0 && (cat === 'all' || p.category === cat) && (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)),
    )
  }, [products, q, cat])

  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id) => setCart((c) => { const n = (c[id] || 0) - 1; const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x })

  const rows = Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((r) => r.p)
  const total = rows.reduce((a, r) => a + priceFor(r.p, defType) * r.qty, 0)
  const count = rows.reduce((a, r) => a + r.qty, 0)

  const place = (form) => {
    const name = form.shop?.trim() || form.fio.trim()
    addCustomer({ name, contact: form.fio.trim(), phone: form.phone.trim(), city: form.address.trim() })
    const cid = useStore.getState().customers[0]?.id
    const items = rows.map((r) => ({ productId: r.p.id, name: r.p.name, qty: r.qty, price: priceFor(r.p, defType), unit: r.p.unit, cell: r.p.cell }))
    addOrder({ customerId: cid, customerName: name, items, total, courier: 'Доставка', address: form.address.trim() })
    setCart({})
    setCheckout(false)
    Alert.alert('Заказ оформлен', `Заказ на ${money(total)} принят в доставку`, [{ text: 'OK', onPress: () => router.back() }])
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Витрина</Text>
      </View>

      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
          <Search size={16} color={C.muted} />
          <Input value={q} onChangeText={setQ} placeholder="Поиск товара…" className="flex-1 h-11 px-2 bg-transparent border-0" />
        </View>
      </View>

      <View className="h-11">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {chips.map((c) => {
            const on = cat === c.key
            return (
              <Pressable key={c.key} onPress={() => setCat(c.key)} className="px-3.5 h-9 rounded-full items-center justify-center flex-row" style={{ backgroundColor: on ? c.color : C.surface2, borderWidth: 1, borderColor: on ? c.color : C.line }}>
                {c.key !== 'all' && <View className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: on ? '#fff' : c.color }} />}
                <Text className="text-[13px] font-medium" style={{ color: on ? '#fff' : C.muted }}>{c.name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: count ? 104 : 16 }}>
        <View className="flex-row flex-wrap">
          {list.map((p) => {
            const ci = catInfo(p.category)
            const qty = cart[p.id] || 0
            return (
              <View key={p.id} className="w-1/2 p-1.5">
                <Pressable onPress={() => add(p.id)} className="rounded-2xl p-3 active:opacity-80" style={{ height: 116, backgroundColor: ci.color + '14', borderWidth: 1, borderColor: qty > 0 ? ci.color : ci.color + '33' }}>
                  {qty > 0 && (
                    <View className="absolute top-2 right-2 h-6 min-w-6 px-1.5 rounded-full items-center justify-center z-10" style={{ backgroundColor: ci.color }}>
                      <Text className="text-white text-[12px] font-bold">{qty}</Text>
                    </View>
                  )}
                  <View className="flex-1 justify-between">
                    <Text className="text-ink text-[13px] font-medium leading-[17px]" numberOfLines={2}>{p.name}</Text>
                    <View>
                      <Text className="font-bold text-[15px]" style={{ color: ci.color }}>{money(priceFor(p, defType))}</Text>
                      <Text className="text-muted text-[11px]">{num(p.stock)} {p.unit}</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )
          })}
        </View>
      </ScrollView>

      {count > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-muted text-[12px]">{count} товаров</Text>
            <Text className="text-ink text-xl font-bold">{money(total)}</Text>
          </View>
          <Pressable onPress={() => setCheckout(true)} className="h-14 px-6 rounded-2xl bg-brand flex-row items-center active:opacity-80">
            <ShoppingCart size={20} color="#fff" />
            <Text className="text-white font-bold text-[16px] ml-2">Оформить</Text>
          </Pressable>
        </View>
      )}

      <CheckoutModal open={checkout} total={total} onClose={() => setCheckout(false)} onPlace={place} />
    </Screen>
  )
}

function CheckoutModal({ open, total, onClose, onPlace }) {
  const [f, setF] = useState({ fio: '', shop: '', address: '', phone: '' })
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const submit = () => {
    if (!f.fio.trim()) return setErr('Укажите имя')
    if (!f.address.trim()) return setErr('Укажите адрес доставки')
    if (!f.phone.trim()) return setErr('Укажите телефон')
    setErr('')
    onPlace(f)
  }
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
        <View className="bg-black/50 flex-1 justify-end">
          <View className="bg-surface rounded-t-3xl p-5 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-ink text-lg font-bold">Оформление заказа</Text>
              <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center"><X size={22} color={C.muted} /></Pressable>
            </View>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-muted">Сумма заказа</Text>
              <Text className="text-ink text-xl font-bold">{money(total)}</Text>
            </View>
            <Field label="Имя получателя"><Input value={f.fio} onChangeText={(v) => set('fio', v)} placeholder="ФИО" autoCapitalize="words" /></Field>
            <Field label="Магазин / компания (необязательно)"><Input value={f.shop} onChangeText={(v) => set('shop', v)} placeholder="Название" autoCapitalize="sentences" /></Field>
            <Field label="Адрес доставки"><Input value={f.address} onChangeText={(v) => set('address', v)} placeholder="Город, улица, дом" autoCapitalize="sentences" /></Field>
            <Field label="Телефон"><Input value={f.phone} onChangeText={(v) => set('phone', v)} placeholder="+7" keyboardType="phone-pad" /></Field>
            {err ? <Text className="text-bad text-[13px] mb-2">{err}</Text> : null}
            <Btn title="Оформить с доставкой" icon={Truck} size="lg" onPress={submit} className="mt-1" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
