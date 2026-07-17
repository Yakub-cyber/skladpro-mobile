import { useState, useEffect, useMemo } from 'react'
import { View, Text, Modal, Pressable, ScrollView, Switch } from 'react-native'
import { X, Trash2 } from 'lucide-react-native'
import { Input, Btn, Field, C } from './ui'
import { money, num } from '../lib/format'

// round3: как в веб-версии — избегаем float-хвостов вроде 0.1+0.2=0.30000000000004.
const round3 = (n) => Math.round(n * 1000) / 1000

// Инициализация draft из заказа. discountPercent храним отдельно как строку,
// чтобы пользователь мог вводить «5» / «10» без принудительной конвертации.
function initDraft(order) {
  const items = (order?.items || []).map((it) => ({ ...it, qty: String(it.qty) }))
  const subtotal = (order?.items || []).reduce((a, x) => a + (Number(x.qty) || 0) * (Number(x.price) || 0), 0)
  // Если у заказа есть discountPercent — берём его, иначе вычисляем из total.
  const dp = order?.discountPercent != null
    ? String(order.discountPercent)
    : subtotal > 0 && order?.total != null
      ? String(round3((1 - (Number(order.total) || 0) / subtotal) * 100))
      : ''
  return { items, onCredit: !!order?.onCredit, discountPercent: dp }
}

export default function EditOrderModal({ visible, order, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initDraft(order))
  const [err, setErr] = useState('')
  useEffect(() => { if (visible) { setDraft(initDraft(order)); setErr('') } }, [visible, order])

  // Пересчёт totals на каждый рендер — недорого при ≤50 позициях в заказе.
  const { subtotal, total } = useMemo(() => {
    const sub = draft.items.reduce((a, x) => a + (Number(x.qty) || 0) * (Number(x.price) || 0), 0)
    const dp = Math.max(0, Math.min(100, Number(draft.discountPercent) || 0))
    return { subtotal: round3(sub), total: round3(sub * (1 - dp / 100)) }
  }, [draft])

  const setQty = (idx, v) => setDraft((d) => ({
    ...d,
    items: d.items.map((it, i) => (i === idx ? { ...it, qty: v } : it)),
  }))
  const removeItem = (idx) => setDraft((d) => ({
    ...d,
    items: d.items.filter((_, i) => i !== idx),
  }))

  const save = () => {
    const items = draft.items
      .map((it) => ({ ...it, qty: Number(it.qty) || 0 }))
      .filter((it) => it.qty > 0)
    if (!items.length) {
      setErr('В заказе не может быть 0 позиций — удалите ненужные и оставьте хотя бы одну')
      return
    }
    const patch = {
      items,
      onCredit: draft.onCredit,
      discountPercent: draft.discountPercent === '' ? 0 : Number(draft.discountPercent) || 0,
      total,
    }
    const r = onSave(patch)
    // updateOrder → { ok:false, error } если заказ уже отгружен/отменён.
    if (r && r.ok === false) {
      setErr(r.error || 'Не удалось сохранить')
      return
    }
    onClose()
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl pt-5 pb-8" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-ink text-lg font-bold">Изменить заказ</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
            {/* Позиции */}
            <Text className="text-muted text-[12px] mb-1.5">Позиции · {draft.items.length}</Text>
            <View className="border border-line rounded-xl overflow-hidden mb-4">
              {draft.items.map((it, i) => (
                <View key={i} className={`px-3 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <View className="flex-row items-center">
                    <View className="flex-1 pr-2">
                      <Text className="text-ink text-[14px]" numberOfLines={1}>{it.name}</Text>
                      <Text className="text-muted text-[11px] mt-0.5">
                        {money(it.price)} × {num(Number(it.qty) || 0)} {it.unit || 'шт'}
                      </Text>
                    </View>
                    <View style={{ width: 76 }}>
                      <Input value={it.qty} onChangeText={(v) => setQty(i, v)} keyboardType="numeric" className="text-center" />
                    </View>
                    <Pressable onPress={() => removeItem(i)} className="h-9 w-9 items-center justify-center ml-1">
                      <Trash2 size={16} color={C.bad} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {draft.items.length === 0 && (
                <Text className="text-muted text-[13px] p-4 text-center">Все позиции удалены</Text>
              )}
            </View>

            {/* Скидка */}
            <Field label="Скидка, %">
              <Input
                value={draft.discountPercent}
                onChangeText={(v) => setDraft((d) => ({ ...d, discountPercent: v }))}
                placeholder="0"
                keyboardType="numeric"
              />
            </Field>

            {/* В долг */}
            <View className="flex-row items-center justify-between py-2 mb-2">
              <View className="flex-1 pr-3">
                <Text className="text-ink text-[14px]">В долг</Text>
                <Text className="text-muted text-[12px] mt-0.5">Сумма пойдёт в баланс клиента</Text>
              </View>
              <Switch
                value={draft.onCredit}
                onValueChange={(v) => setDraft((d) => ({ ...d, onCredit: v }))}
                thumbColor={draft.onCredit ? C.brand : undefined}
                trackColor={{ true: C.brand + '66', false: undefined }}
              />
            </View>

            {/* Итого */}
            <View className="flex-row items-center justify-between pt-2 border-t border-line">
              <Text className="text-muted">Подытог</Text>
              <Text className="text-ink text-[14px]">{money(subtotal)}</Text>
            </View>
            <View className="flex-row items-center justify-between pt-1 pb-2">
              <Text className="text-muted">Итого</Text>
              <Text className="text-ink text-xl font-bold">{money(total)}</Text>
            </View>

            {err ? <Text className="text-[13px] text-bad mb-2">{err}</Text> : null}
            <View className="flex-row gap-3 mt-1">
              <View className="flex-1">
                <Btn title="Отмена" variant="soft" onPress={onClose} />
              </View>
              <View className="flex-1">
                <Btn title="Сохранить" onPress={save} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
