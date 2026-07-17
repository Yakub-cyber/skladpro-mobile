import { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Search, ScanLine } from 'lucide-react-native'
import { Input, C } from './ui'
import Scanner from './Scanner'

// Единый инпут «поиск + камера» для pos/document/order-new. Раньше в каждом
// экране поле поиска и кнопка сканера были собственные — дублирование и
// расхождение UX. Здесь одна карточка: слева иконка поиска, поле, справа
// кнопка камеры (если задан onScan).
//
// Автосабмит по штрихкоду: если введённая строка — 8+ цифр и жмут Enter,
// это USB-сканер, трактуем как onScan(digits). Опционально (submitOnDigits).
export default function SmartFind({
  value,
  onChangeText,
  placeholder = 'Поиск товара…',
  onScan,
  submitOnDigits = true,
  autoFocus,
}) {
  const [scanOpen, setScanOpen] = useState(false)

  const handleSubmit = () => {
    if (!submitOnDigits || !onScan) return
    const v = (value || '').trim()
    if (/^\d{8,}$/.test(v)) {
      onScan(v)
      onChangeText?.('')
    }
  }

  const handleScan = (code) => {
    setScanOpen(false)
    onScan?.(code)
  }

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-1 flex-row items-center bg-surface-2 rounded-xl border border-line px-3 h-11">
        <Search size={16} color={C.muted} />
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          className="flex-1 h-11 px-2 bg-transparent border-0"
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoFocus={autoFocus}
        />
      </View>
      {onScan && (
        <Pressable
          onPress={() => setScanOpen(true)}
          className="h-11 w-11 rounded-xl bg-brand items-center justify-center active:opacity-80"
        >
          <ScanLine size={20} color="#fff" />
        </Pressable>
      )}
      {onScan && <Scanner visible={scanOpen} onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </View>
  )
}
