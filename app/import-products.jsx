import { useState, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Btn, Empty, C } from '../components/ui'
import { num, money } from '../lib/format'
import {
  parseTextToTable,
  autoMap,
  applyMapping,
  IMPORT_FIELDS,
  SAMPLE_TEMPLATE,
} from '../lib/importPrice'

// 3-шаговый мастер импорта прайса. Вход — CSV/TSV, вставленный в поле
// ввода (полный document picker + SheetJS/xlsx — отдельная задача, они
// тянут ~1 МБ и нативный слой). Пользователь копирует из Excel/
// Google Sheets — вставка через long-press работает нативно.
//
// Шаги: paste → mapping → preview → batch save.
export default function ImportProducts() {
  const products = useStore((s) => s.products)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)

  const [step, setStep] = useState('input')
  const [text, setText] = useState('')
  const [table, setTable] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})

  const parse = () => {
    const t = parseTextToTable(text)
    if (!t.headers.length) {
      Alert.alert('Ничего не разобрано', 'Проверьте, что данные вставлены и разделитель — таб/;/,')
      return
    }
    setTable(t)
    setMapping(autoMap(t.headers))
    setStep('mapping')
  }

  const preview = useMemo(() => {
    if (!table) return { rows: [], news: 0, updates: 0, errors: [] }
    const rows = applyMapping(table, mapping, products)
    const errors = []
    rows.forEach((r) => {
      if (!r.sku) errors.push(`Строка ${r._rowIdx}: нет SKU`)
      else if (!r.name) errors.push(`Строка ${r._rowIdx}: нет названия`)
    })
    return {
      rows,
      news: rows.filter((r) => r._action === 'new').length,
      updates: rows.filter((r) => r._action === 'update').length,
      errors,
    }
  }, [table, mapping, products])

  const commit = () => {
    const valid = preview.rows.filter((r) => r.sku && r.name)
    let created = 0
    let updated = 0
    for (const r of valid) {
      const patch = { ...r }
      delete patch._existing
      delete patch._action
      delete patch._rowIdx
      if (r._action === 'update' && r._existing) {
        updateProduct(r._existing.id, patch)
        updated++
      } else {
        addProduct(patch)
        created++
      }
    }
    Alert.alert('Импорт готов', `Создано: ${created}, обновлено: ${updated}`, [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Импорт товаров</Text>
      </View>

      <StepIndicator step={step} />

      {step === 'input' && (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text className="text-muted text-[13px] mb-2">
            Скопируйте таблицу из Excel/Google Sheets/CSV и вставьте сюда. Первая строка —
            заголовки колонок (артикул, название, цена и т.п.).
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={'артикул\tназвание\tцена\n…'}
            placeholderTextColor={C.muted}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 220,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.surface2,
              color: C.ink,
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          />
          <View className="mt-2 flex-row gap-2">
            <View className="flex-1">
              <Btn title="Пример" variant="soft" onPress={() => setText(SAMPLE_TEMPLATE)} />
            </View>
            <View className="flex-1">
              <Btn title="Разобрать" onPress={parse} disabled={!text.trim()} />
            </View>
          </View>
        </ScrollView>
      )}

      {step === 'mapping' && table && (
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text className="text-muted text-[13px] mb-3">
            Найдено колонок: <Text className="text-ink font-semibold">{table.headers.length}</Text>,
            строк: <Text className="text-ink font-semibold">{table.rows.length}</Text>.
            Проверьте соответствие полей.
          </Text>
          {IMPORT_FIELDS.map((f) => (
            <View key={f.key} className="mb-3">
              <View className="flex-row items-center mb-1.5">
                <Text className="text-ink text-[13px] font-medium">{f.label}</Text>
                {f.required && <Text className="text-bad text-[13px] ml-1">*</Text>}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <ChipOption
                  label="—"
                  active={mapping[f.key] == null || mapping[f.key] === -1}
                  onPress={() => setMapping((m) => ({ ...m, [f.key]: -1 }))}
                />
                {table.headers.map((h, i) => (
                  <ChipOption
                    key={i}
                    label={h || `Кол. ${i + 1}`}
                    active={mapping[f.key] === i}
                    onPress={() => setMapping((m) => ({ ...m, [f.key]: i }))}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
          <View className="flex-row gap-2 mt-2">
            <View className="flex-1">
              <Btn title="Назад" variant="soft" onPress={() => setStep('input')} />
            </View>
            <View className="flex-1">
              <Btn
                title="Предпросмотр"
                onPress={() => setStep('preview')}
                disabled={mapping.sku == null || mapping.name == null || mapping.sku === -1 || mapping.name === -1}
                icon={ChevronRight}
              />
            </View>
          </View>
        </ScrollView>
      )}

      {step === 'preview' && (
        <View className="flex-1">
          <View className="px-4 py-3 flex-row gap-3 border-b border-line">
            <Chip label={`Новых: ${preview.news}`} color={C.ok} />
            <Chip label={`Обновить: ${preview.updates}`} color={C.info} />
            {preview.errors.length > 0 && (
              <Chip label={`Ошибок: ${preview.errors.length}`} color={C.bad} />
            )}
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
            {preview.rows.length === 0 && <Empty title="Нет валидных строк" />}
            {preview.rows.map((r, i) => (
              <View key={i} className="flex-row items-center py-2 border-b border-line">
                <View className="w-1 h-8 rounded mr-2" style={{ backgroundColor: r._action === 'new' ? C.ok : C.info }} />
                <View className="flex-1 pr-2">
                  <Text className="text-ink text-[13px]" numberOfLines={1}>
                    {r.name || <Text className="text-bad">без названия</Text>}
                  </Text>
                  <Text className="text-muted text-[11px]">
                    {r.sku || 'SKU?'}{r.category ? ` · ${r.category}` : ''}
                    {r.price != null ? ` · ${money(r.price)}` : ''}
                    {r.stock != null ? ` · ${num(r.stock)} ${r.unit || 'шт'}` : ''}
                  </Text>
                </View>
                {r._action === 'update' ? (
                  <Text className="text-info text-[11px]">обновить</Text>
                ) : (
                  <Text className="text-ok text-[11px]">новый</Text>
                )}
              </View>
            ))}
          </ScrollView>
          {preview.errors.length > 0 && (
            <View className="px-4 pt-2 pb-1 border-t border-line" style={{ backgroundColor: C.bad + '11' }}>
              <View className="flex-row items-center">
                <AlertTriangle size={13} color={C.bad} />
                <Text className="text-bad text-[12px] ml-1.5">Пропущено {preview.errors.length} строк без SKU или названия</Text>
              </View>
            </View>
          )}
          <View className="px-4 pt-3 pb-6 border-t border-line flex-row gap-2">
            <View className="flex-1">
              <Btn title="Назад" variant="soft" onPress={() => setStep('mapping')} />
            </View>
            <View className="flex-1">
              <Btn
                title={`Импортировать · ${preview.news + preview.updates}`}
                onPress={commit}
                icon={Check}
                disabled={preview.rows.length === 0}
              />
            </View>
          </View>
        </View>
      )}
    </Screen>
  )
}

function StepIndicator({ step }) {
  const steps = [
    { key: 'input', label: 'Вставка' },
    { key: 'mapping', label: 'Колонки' },
    { key: 'preview', label: 'Проверка' },
  ]
  const active = steps.findIndex((s) => s.key === step)
  return (
    <View className="flex-row px-4 py-3 border-b border-line">
      {steps.map((s, i) => {
        const done = i <= active
        return (
          <View key={s.key} className="flex-1 items-center">
            <View className="h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: done ? C.brand : C.surface3 }}>
              <Text className={`text-[12px] font-bold ${done ? 'text-white' : 'text-muted'}`}>{i + 1}</Text>
            </View>
            <Text className="text-[10px] text-muted mt-1" numberOfLines={1}>{s.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

function ChipOption({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="px-3 h-9 rounded-full items-center justify-center"
      style={{ backgroundColor: active ? C.brand : C.surface2, borderWidth: 1, borderColor: active ? C.brand : C.line }}
    >
      <Text className="text-[13px]" style={{ color: active ? '#fff' : C.muted }}>{label}</Text>
    </Pressable>
  )
}

function Chip({ label, color }) {
  return (
    <View className="px-2.5 h-7 rounded-full items-center justify-center" style={{ backgroundColor: color + '22' }}>
      <Text className="text-[12px] font-medium" style={{ color }}>{label}</Text>
    </View>
  )
}
