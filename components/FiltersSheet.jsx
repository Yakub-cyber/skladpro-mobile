import { useState, useEffect } from 'react'
import { View, Text, Modal, Pressable, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import { Input, Btn, Field, C } from './ui'

// Пустой набор — по нему сбрасываем и определяем «фильтр не задан».
// Совпадает с EMPTY_FILTERS в веб-версии, чтобы поведение фильтрации
// (см. applyProductFilters ниже) было идентично.
export const EMPTY_FILTERS = {
  priceMin: '',
  priceMax: '',
  stockMin: '',
  stockMax: '',
  stockStatus: 'any', // any | low (ниже min) | out (0) | in (>0)
  weighted: 'any',    // any | yes | no
  marked: 'any',
}

export function activeFiltersCount(f = EMPTY_FILTERS) {
  let n = 0
  if (f.priceMin !== '') n++
  if (f.priceMax !== '') n++
  if (f.stockMin !== '') n++
  if (f.stockMax !== '') n++
  if (f.stockStatus !== 'any') n++
  if (f.weighted !== 'any') n++
  if (f.marked !== 'any') n++
  return n
}

// Чистая функция фильтрации — портирована из веб-версии один-в-один
// (без tags/priceMin по типу цены — на мобилке пока нет UI для этого).
export function applyProductFilters(products, f = EMPTY_FILTERS) {
  const numOr = (v, fallback) => (v === '' || v == null ? fallback : Number(v))
  return products.filter((p) => {
    const price = Number(p.price) || 0
    if (price < numOr(f.priceMin, -Infinity)) return false
    if (price > numOr(f.priceMax, Infinity)) return false
    const stock = Number(p.stock) || 0
    if (stock < numOr(f.stockMin, -Infinity)) return false
    if (stock > numOr(f.stockMax, Infinity)) return false
    const min = Number(p.minStock) || 0
    if (f.stockStatus === 'low' && stock > min) return false
    if (f.stockStatus === 'out' && stock > 0) return false
    if (f.stockStatus === 'in' && stock <= 0) return false
    if (f.weighted === 'yes' && !p.weighted) return false
    if (f.weighted === 'no' && p.weighted) return false
    if (f.marked === 'yes' && !p.marked) return false
    if (f.marked === 'no' && p.marked) return false
    return true
  })
}

const STOCK_STATUS_OPTIONS = [
  { key: 'any', label: 'Все' },
  { key: 'low', label: 'Ниже мин.' },
  { key: 'out', label: 'Ноль' },
  { key: 'in', label: 'В наличии' },
]
const YES_NO_OPTIONS = [
  { key: 'any', label: 'Все' },
  { key: 'yes', label: 'Да' },
  { key: 'no', label: 'Нет' },
]

// Внутреннее состояние — черновик фильтров: «Применить» его выкатывает
// наружу, «Сбросить» — сразу зачищает и родителя. При открытии заново
// подтягиваем свежий value (если внешне что-то поменялось).
export default function FiltersSheet({ visible, value = EMPTY_FILTERS, onClose, onApply }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (visible) setDraft(value) }, [visible, value])

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const reset = () => {
    setDraft(EMPTY_FILTERS)
    onApply(EMPTY_FILTERS)
    onClose()
  }
  const apply = () => {
    onApply(draft)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-ink text-lg font-bold">Фильтры</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Цена от">
                  <Input value={draft.priceMin} onChangeText={(v) => set('priceMin', v)} placeholder="0" keyboardType="numeric" />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Цена до">
                  <Input value={draft.priceMax} onChangeText={(v) => set('priceMax', v)} placeholder="∞" keyboardType="numeric" />
                </Field>
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Остаток от">
                  <Input value={draft.stockMin} onChangeText={(v) => set('stockMin', v)} placeholder="0" keyboardType="numeric" />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Остаток до">
                  <Input value={draft.stockMax} onChangeText={(v) => set('stockMax', v)} placeholder="∞" keyboardType="numeric" />
                </Field>
              </View>
            </View>

            <ChipRow label="Статус остатка" options={STOCK_STATUS_OPTIONS} value={draft.stockStatus} onChange={(v) => set('stockStatus', v)} />
            <ChipRow label="Весовой" options={YES_NO_OPTIONS} value={draft.weighted} onChange={(v) => set('weighted', v)} />
            <ChipRow label="Маркировка" options={YES_NO_OPTIONS} value={draft.marked} onChange={(v) => set('marked', v)} />

            <View className="flex-row gap-3 mt-2 mb-2">
              <View className="flex-1">
                <Btn title="Сбросить" variant="soft" onPress={reset} />
              </View>
              <View className="flex-1">
                <Btn title="Применить" onPress={apply} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function ChipRow({ label, options, value, onChange }) {
  return (
    <View className="mb-3">
      <Text className="text-muted text-[12px] mb-1.5">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.key
          return (
            <Pressable
              key={o.key}
              onPress={() => onChange(o.key)}
              className="px-3.5 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: on ? C.brand : C.surface2, borderWidth: 1, borderColor: on ? C.brand : C.line }}
            >
              <Text className="text-[13px] font-medium" style={{ color: on ? '#fff' : C.muted }}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
