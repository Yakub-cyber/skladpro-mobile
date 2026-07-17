import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, Search, Plus, Minus, Check, FileEdit } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Input, Btn, Empty, C } from '../components/ui'
import { num, money } from '../lib/format'
import { catInfo } from '../lib/constants'

const TYPES = {
  purchase: { title: 'Закупка / приход', verb: 'Оприходовать', color: C.ok },
  writeoff: { title: 'Списание', verb: 'Списать', color: C.bad },
  sale_return: { title: 'Возврат продажи', verb: 'Принять возврат', color: C.info },
  purchase_return: { title: 'Возврат поставщику', verb: 'Оформить возврат', color: C.warn },
  transfer: { title: 'Перемещение', verb: 'Переместить', color: C.info, transfer: true },
  inventory: { title: 'Инвентаризация', verb: 'Применить пересчёт', color: C.brand, count: true },
}

export default function DocumentScreen() {
  const params = useLocalSearchParams()
  const type = TYPES[params.type] ? params.type : 'purchase'
  const t = TYPES[type]
  const products = useStore((s) => s.products)
  const warehouses = useStore((s) => s.warehouses) || []
  const addDocument = useStore((s) => s.addDocument)

  const [q, setQ] = useState('')
  const [qty, setQty] = useState({}) // productId -> число
  const [toWh, setToWh] = useState(warehouses[0]?.id || '')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))
  }, [products, q])

  const whName = (id) => warehouses.find((w) => w.id === id)?.name || '—'
  const setVal = (id, v) => setQty((m) => { const x = { ...m }; if (v <= 0 && !t.count) delete x[id]; else x[id] = v; return x })
  const add = (p) => setVal(p.id, (qty[p.id] ?? (t.count ? p.stock : 0)) + 1)
  const dec = (p) => setVal(p.id, Math.max(0, (qty[p.id] ?? (t.count ? p.stock : 0)) - 1))

  const picked = Object.keys(qty).length
  const apply = (post = true) => {
    const entries = Object.entries(qty)
    if (!entries.length) return
    const docType = type === 'purchase_return' ? 'supplier_return' : type
    const items = entries.map(([id, n]) => {
      const p = products.find((x) => x.id === id)
      const it = { productId: id, name: p.name, unit: p.unit, qty: n }
      if (type === 'transfer') it.fromWh = p.warehouseId
      if (type === 'inventory') it.prevStock = p.stock
      return it
    })
    const doc = { type: docType, items, reason: t.title }
    if (type === 'transfer') doc.toWarehouseId = toWh
    const r = addDocument(doc, { post })
    // addDocument вернёт { ok:false, error } при попытке провести
    // документ, требующий больше товара, чем есть на остатке.
    if (r && typeof r === 'object' && r.ok === false) {
      Alert.alert('Не хватает остатка', r.error)
      return
    }
    Alert.alert('Готово', `${t.title}: ${picked} поз. ${post ? 'проведено' : '— черновик'}`, [{ text: 'OK', onPress: () => router.back() }])
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
        {t.transfer && (
          <View className="mt-3">
            <Text className="text-muted text-[12px] mb-1.5">Склад назначения</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {warehouses.map((w) => {
                const on = toWh === w.id
                return (
                  <Pressable key={w.id} onPress={() => setToWh(w.id)} className="px-3.5 h-9 rounded-full items-center justify-center" style={{ backgroundColor: on ? t.color : C.surface2, borderWidth: 1, borderColor: on ? t.color : C.line }}>
                    <Text className="text-[13px] font-medium" style={{ color: on ? '#fff' : C.muted }}>{w.name}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}
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
                <Text className="text-muted text-[12px] mt-0.5">{t.count ? `на складе ${num(p.stock)} ${p.unit}` : t.transfer ? `${num(p.stock)} ${p.unit} · из «${whName(p.warehouseId)}»` : `${num(p.stock)} ${p.unit} · ${money(p.price)}`}</Text>
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
          {t.transfer && (
            <Text className="text-muted text-[12px] mb-2 text-center">Переместить на склад «{whName(toWh)}»</Text>
          )}
          <View className="flex-row gap-2">
            <Btn title="Черновик" variant="soft" icon={FileEdit} size="lg" disabled={t.transfer && !toWh} onPress={() => apply(false)} className="flex-1" />
            <Btn title={`${t.verb} · ${picked}`} icon={Check} size="lg" disabled={t.transfer && !toWh} onPress={() => apply(true)} className="flex-1" />
          </View>
        </View>
      )}
    </Screen>
  )
}
