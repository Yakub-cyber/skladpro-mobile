import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Modal } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { ChevronLeft, Package, PackagePlus, PackageMinus, AlertTriangle, X } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Badge, Empty, Btn, Input, Field, C } from '../../components/ui'
import { money, num } from '../../lib/format'
import { catInfo, canAccess } from '../../lib/constants'

export default function ProductDetail() {
  const { id } = useLocalSearchParams()
  const product = useStore((s) => s.products.find((p) => p.id === id))
  const receiveOp = useStore((s) => s.receiveOp)
  const writeOff = useStore((s) => s.writeOff)
  const me = useStore((s) => s.employees.find((e) => e.id === s.authUserId))
  const [op, setOp] = useState(null) // 'in' | 'out'

  const canOps = canAccess(me?.role, 'operations')

  if (!product) {
    return (
      <Screen>
        <Header title="Товар" />
        <Empty title="Товар не найден" />
      </Screen>
    )
  }

  const ci = catInfo(product.category)
  const low = product.stock <= product.minStock

  // Возвращает результат для QtyModal — модалка сама решит закрываться или
  // показать ошибку. Приёмка не может отказать (только прибавляет), списание
  // блокируется при попытке уйти в минус.
  const apply = (qty) => {
    if (op === 'in') {
      receiveOp([{ productId: product.id, name: product.name, qty }], 'Приёмка (моб.)')
      return { ok: true }
    }
    return writeOff(product.id, qty, 'Списание (моб.)')
  }

  return (
    <Screen>
      <Header title={product.sku} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Карточка товара */}
        <Card className="p-5 mb-3 items-center">
          <View className="h-16 w-16 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: ci.color + '22' }}>
            <Package size={30} color={ci.color} />
          </View>
          <Text className="text-ink text-lg font-bold text-center">{product.name}</Text>
          <View className="mt-2"><Badge color={ci.color}>{product.category}</Badge></View>
        </Card>

        {/* Цена и остаток */}
        <View className="flex-row gap-3 mb-3">
          <Card className="flex-1 p-4">
            <Text className="text-muted text-[12px] mb-1">Цена</Text>
            <Text className="text-ink text-lg font-bold">{money(product.price)}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Text className="text-muted text-[12px] mb-1">Остаток</Text>
            <View className="flex-row items-center">
              {low && <AlertTriangle size={15} color={C.warn} />}
              <Text className={`text-lg font-bold ml-1 ${low ? 'text-warn' : 'text-ink'}`}>{num(product.stock)} {product.unit}</Text>
            </View>
          </Card>
        </View>

        {/* Доп. инфо */}
        <Card className="overflow-hidden mb-4">
          <Row label="Артикул" value={product.sku} />
          <Row label="Мин. остаток" value={`${num(product.minStock)} ${product.unit}`} border />
          <Row label="Ячейка" value={product.cell || '—'} border />
          {product.barcode ? <Row label="Штрихкод" value={product.barcode} border /> : null}
        </Card>

        {/* Операции склада */}
        {canOps && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Btn title="Приёмка" icon={PackagePlus} onPress={() => setOp('in')} />
            </View>
            <View className="flex-1">
              <Btn title="Списание" variant="soft" icon={PackageMinus} onPress={() => setOp('out')} />
            </View>
          </View>
        )}
      </ScrollView>

      <QtyModal op={op} product={product} onClose={() => setOp(null)} onApply={apply} />
    </Screen>
  )
}

function Row({ label, value, border }) {
  return (
    <View className={`flex-row items-center justify-between px-4 py-3.5 ${border ? 'border-t border-line' : ''}`}>
      <Text className="text-muted text-[14px]">{label}</Text>
      <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{value}</Text>
    </View>
  )
}

function QtyModal({ op, product, onClose, onApply }) {
  const [qty, setQty] = useState('')
  const [err, setErr] = useState('')
  const inMode = op === 'in'
  const close = () => {
    setQty('')
    setErr('')
    onClose()
  }
  const submit = () => {
    const n = parseFloat(qty.replace(',', '.'))
    if (!n || n <= 0) {
      setErr('Укажите количество')
      return
    }
    const r = onApply(n)
    // Успех → закрыть; отказ (списание > остатка) → показать причину и оставить модалку.
    if (r && r.ok === false) {
      setErr(r.error || 'Не удалось выполнить операцию')
      return
    }
    close()
  }
  return (
    <Modal visible={!!op} animationType="slide" transparent onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-bold">{inMode ? 'Приёмка товара' : 'Списание товара'}</Text>
            <Pressable onPress={close} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <Text className="text-muted text-[13px] mb-3" numberOfLines={1}>{product?.name}</Text>
          <Field label={`Количество (${product?.unit || 'шт'})`}>
            <Input
              value={qty}
              onChangeText={(v) => { setQty(v); if (err) setErr('') }}
              placeholder="0"
              keyboardType="numeric"
              autoFocus
            />
          </Field>
          {err ? <Text className="text-[13px] text-bad mt-1 mb-1">{err}</Text> : null}
          <Btn
            title={inMode ? 'Принять на склад' : 'Списать со склада'}
            variant={inMode ? 'primary' : 'bad'}
            icon={inMode ? PackagePlus : PackageMinus}
            onPress={submit}
            className="mt-2"
          />
        </View>
      </View>
    </Modal>
  )
}

function Header({ title }) {
  return (
    <View className="flex-row items-center px-3 h-12 border-b border-line">
      <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
        <ChevronLeft size={24} color={C.ink} />
      </Pressable>
      <Text className="text-ink text-lg font-semibold ml-1">{title}</Text>
    </View>
  )
}
