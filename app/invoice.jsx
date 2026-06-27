import { useState } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Sparkles, Check, X } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { parseInvoiceText } from '../lib/ai'
import { Screen, Card, Badge, Btn, Input, Field, Empty, C } from '../components/ui'
import { money, num } from '../lib/format'

export default function Invoice() {
  const products = useStore((s) => s.products)
  const addInvoice = useStore((s) => s.addInvoice)
  const [text, setText] = useState('')
  const [items, setItems] = useState(null)
  const [party, setParty] = useState('')

  const recognize = () => {
    const parsed = parseInvoiceText(text, products)
    setItems(parsed)
  }

  const total = (items || []).reduce((a, it) => a + it.qty * (it.price || 0), 0)

  const create = () => {
    const rows = items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, price: it.price || 0, unit: it.unit }))
    addInvoice({ kind: 'in', party: party.trim() || 'Поставщик', items: rows, total })
    Alert.alert('Готово', 'Приходная накладная создана', [{ text: 'OK', onPress: () => router.back() }])
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">ИИ-накладная</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center mb-2">
            <Sparkles size={16} color={C.brand} />
            <Text className="text-ink font-semibold ml-2">Опишите товары текстом</Text>
          </View>
          <Text className="text-muted text-[13px] mb-3">Например: «Гвозди 100шт, Молоток 5шт, Саморез по дереву 3.5×40 200уп»</Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Введите или вставьте список товаров…"
            placeholderTextColor={C.muted}
            multiline
            className="bg-surface-2 border border-line rounded-xl text-ink text-[15px] p-3.5"
            style={{ minHeight: 110, textAlignVertical: 'top' }}
          />

          <Btn title="Распознать" icon={Sparkles} onPress={recognize} className="mt-3" disabled={!text.trim()} />

          {items && (
            items.length === 0 ? (
              <Card className="mt-4"><Empty title="Не распознано" text="Уточните формулировку" /></Card>
            ) : (
              <View className="mt-4">
                <Text className="text-ink font-semibold mb-2">Распознано позиций: {items.length}</Text>
                <Card className="overflow-hidden mb-3">
                  {items.map((it, i) => (
                    <View key={i} className={`flex-row items-center px-3.5 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center">
                          <Text className="text-ink text-[14px]" numberOfLines={1}>{it.name}</Text>
                          {it.matched ? (
                            <View className="ml-2"><Badge color={C.ok}>в базе</Badge></View>
                          ) : (
                            <View className="ml-2"><Badge color={C.warn}>новый</Badge></View>
                          )}
                        </View>
                        <Text className="text-muted text-[12px] mt-0.5">{num(it.qty)} {it.unit}{it.price ? ` × ${money(it.price)}` : ''}</Text>
                      </View>
                      <Text className="text-ink font-semibold">{money(it.qty * (it.price || 0))}</Text>
                    </View>
                  ))}
                  <View className="flex-row items-center justify-between px-3.5 py-3 border-t border-line">
                    <Text className="text-muted">Итого</Text>
                    <Text className="text-ink text-lg font-bold">{money(total)}</Text>
                  </View>
                </Card>

                <Field label="Поставщик">
                  <Input value={party} onChangeText={setParty} placeholder="Название поставщика" autoCapitalize="sentences" />
                </Field>
                <Btn title="Создать приходную накладную" icon={Check} onPress={create} className="mt-1" />
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
