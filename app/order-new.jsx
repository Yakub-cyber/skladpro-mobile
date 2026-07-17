import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, User, UserPlus, Check, X, ChevronRight } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Input, Btn, Avatar, Empty, Field, C } from '../components/ui'
import SmartFind from '../components/SmartFind'
import { money, num } from '../lib/format'
import { CATEGORIES, catInfo, priceFor } from '../lib/constants'

export default function OrderNew() {
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const priceTypes = useStore((s) => s.priceTypes)
  const addOrder = useStore((s) => s.addOrder)
  const addCustomer = useStore((s) => s.addCustomer)
  const defType = priceTypes.find((t) => t.default)?.id || priceTypes[0]?.id

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [cart, setCart] = useState({})
  const [customer, setCustomer] = useState(null)
  const [custOpen, setCustOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCity, setNewCity] = useState('')

  const priceType = customer?.priceTypeId || defType

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter(
      (p) => (cat === 'all' || p.category === cat) && (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)),
    )
  }, [products, q, cat])

  const chips = [{ key: 'all', name: 'Все', color: C.brand }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.key, color: c.color }))]
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const dec = (id) => setCart((c) => { const n = (c[id] || 0) - 1; const x = { ...c }; if (n <= 0) delete x[id]; else x[id] = n; return x })

  const rows = Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((r) => r.p)
  const total = rows.reduce((a, r) => a + priceFor(r.p, priceType) * r.qty, 0)
  const count = rows.reduce((a, r) => a + r.qty, 0)

  // Создать клиента прямо из модалки выбора — не выходя из потока заказа.
  // addCustomer в сторе не возвращает id: только что созданный кладётся
  // первым в массив customers.
  const saveNewCustomer = () => {
    const name = newName.trim()
    if (!name) return
    addCustomer({
      name,
      phone: newPhone.trim() || undefined,
      city: newCity.trim() || undefined,
    })
    const created = useStore.getState().customers[0]
    if (created) setCustomer(created)
    setNewName(''); setNewPhone(''); setNewCity('')
    setShowCreate(false)
    setCustOpen(false)
  }
  const cancelCreate = () => {
    setNewName(''); setNewPhone(''); setNewCity('')
    setShowCreate(false)
  }

  const create = () => {
    if (!count) return
    const items = rows.map((r) => ({ productId: r.p.id, name: r.p.name, qty: r.qty, price: priceFor(r.p, priceType), unit: r.p.unit, cell: r.p.cell }))
    addOrder({
      customerId: customer?.id || 'retail',
      customerName: customer?.name || 'Розничный покупатель',
      items,
      total,
      priceTypeId: priceType,
      courier: 'Самовывоз',
      address: customer?.city || '—',
    })
    setCart({})
    Alert.alert('Заказ создан', `Заказ на ${money(total)} оформлен`, [{ text: 'OK', onPress: () => router.back() }])
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Новый заказ</Text>
      </View>

      {/* Клиент */}
      <Pressable onPress={() => setCustOpen(true)} className="flex-row items-center mx-4 mt-3 mb-1 px-3.5 h-12 rounded-xl bg-surface-2 border border-line active:opacity-80">
        <User size={17} color={C.brand} />
        <Text className="text-ink text-[14px] ml-2.5 flex-1" numberOfLines={1}>{customer ? customer.name : 'Розничный покупатель'}</Text>
        <Text className="text-muted text-[12px] mr-1">сменить</Text>
        <ChevronRight size={16} color={C.muted} />
      </Pressable>

      {/* Поиск + сканер + категории */}
      <View className="px-4 pt-2">
        <SmartFind
          value={q}
          onChangeText={setQ}
          onScan={(code) => {
            const p = products.find((x) => x.barcode === code || x.sku === code)
            if (p) add(p.id)
            else Alert.alert('Не найдено', `Товар со штрихкодом ${code} не найден`)
          }}
          placeholder="Поиск товара…"
        />
      </View>
      <View className="h-11 mt-2">
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

      {/* Плитки */}
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
                      <Text className="font-bold text-[15px]" style={{ color: ci.color }}>{money(priceFor(p, priceType))}</Text>
                      <Text className="text-muted text-[11px]">{num(p.stock)} {p.unit}</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Чек */}
      {count > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-line px-4 pt-3 pb-7 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-muted text-[12px]">{count} товаров</Text>
            <Text className="text-ink text-xl font-bold">{money(total)}</Text>
          </View>
          <Pressable onPress={create} className="h-14 px-6 rounded-2xl bg-brand flex-row items-center active:opacity-80">
            <Check size={20} color="#fff" />
            <Text className="text-white font-bold text-[16px] ml-2">Создать заказ</Text>
          </Pressable>
        </View>
      )}

      {/* Выбор клиента */}
      <Modal visible={custOpen} animationType="slide" transparent onRequestClose={() => { cancelCreate(); setCustOpen(false) }}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-ink text-lg font-bold">Клиент</Text>
              <View className="flex-row items-center">
                {!showCreate && (
                  <Pressable onPress={() => setShowCreate(true)} className="flex-row items-center h-9 px-3 rounded-full bg-surface-2 border border-line active:opacity-80 mr-2">
                    <UserPlus size={15} color={C.brand} />
                    <Text className="text-brand text-[13px] font-medium ml-1.5">Добавить</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => { cancelCreate(); setCustOpen(false) }} className="h-9 w-9 items-center justify-center"><X size={22} color={C.muted} /></Pressable>
              </View>
            </View>
            {showCreate ? (
              <View className="px-5">
                <Field label="Имя / название">
                  <Input value={newName} onChangeText={setNewName} placeholder="Например, ИП Иванов" autoFocus />
                </Field>
                <Field label="Телефон">
                  <Input value={newPhone} onChangeText={setNewPhone} placeholder="+7 (___) ___-__-__" keyboardType="phone-pad" />
                </Field>
                <Field label="Город">
                  <Input value={newCity} onChangeText={setNewCity} placeholder="Москва" />
                </Field>
                <View className="flex-row gap-3 mt-2">
                  <View className="flex-1">
                    <Btn title="Отмена" variant="soft" onPress={cancelCreate} />
                  </View>
                  <View className="flex-1">
                    <Btn title="Сохранить" onPress={saveNewCustomer} />
                  </View>
                </View>
              </View>
            ) : (
              <ScrollView className="px-5">
                <Pressable onPress={() => { setCustomer(null); setCustOpen(false) }} className="flex-row items-center py-3 border-b border-line">
                  <Avatar name="Розничный" color={C.muted} size={38} />
                  <Text className="text-ink text-[14px] ml-3 flex-1">Розничный покупатель</Text>
                  {!customer && <Check size={18} color={C.brand} />}
                </Pressable>
                {customers.map((c) => (
                  <Pressable key={c.id} onPress={() => { setCustomer(c); setCustOpen(false) }} className="flex-row items-center py-3 border-b border-line">
                    <Avatar name={c.name} color={C.info} size={38} />
                    <View className="flex-1 ml-3">
                      <Text className="text-ink text-[14px]" numberOfLines={1}>{c.name}</Text>
                      <Text className="text-muted text-[12px]">{c.city || ''}</Text>
                    </View>
                    {customer?.id === c.id && <Check size={18} color={C.brand} />}
                  </Pressable>
                ))}
                {customers.length === 0 && <Empty title="Клиентов нет" />}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  )
}
