import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import {
  X, ScanLine, ClipboardList, Navigation, Package, UserSquare2, ChevronRight,
  Sparkles, Warehouse, Store, Plus, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Undo2,
  ArrowLeftRight, Truck,
} from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, C } from '../components/ui'
import { roleInfo, canAccess } from '../lib/constants'

const OPS = [
  // Документы (создание)
  { perm: 'orders', label: 'Новый заказ', sub: 'Заказ клиента', icon: Plus, to: '/order-new', color: C.brand, g: 'Документы' },
  { perm: 'orders', label: 'Продажа (касса)', sub: 'Сканер, оплата, сдача', icon: ScanLine, to: '/pos', color: C.brand, g: 'Документы' },
  { perm: 'invoices', label: 'ИИ-накладная', sub: 'Приёмка из текста', icon: Sparkles, to: '/invoice', color: C.info, g: 'Документы' },
  { perm: 'operations', label: 'Закупка / приход', sub: 'Оприходовать товар', icon: ArrowDownToLine, to: '/document?type=purchase', color: C.ok, g: 'Документы' },
  { perm: 'operations', label: 'Списание', sub: 'Брак, недостача, порча', icon: ArrowUpFromLine, to: '/document?type=writeoff', color: C.bad, g: 'Документы' },
  { perm: 'operations', label: 'Возврат продажи', sub: 'Товар от клиента на склад', icon: Undo2, to: '/document?type=sale_return', color: C.info, g: 'Документы' },
  { perm: 'operations', label: 'Возврат поставщику', sub: 'Вернуть закупленное', icon: Truck, to: '/document?type=purchase_return', color: C.warn, g: 'Документы' },
  { perm: 'operations', label: 'Перемещение', sub: 'Между складами', icon: ArrowLeftRight, to: '/document?type=transfer', color: C.info, g: 'Документы' },
  { perm: 'operations', label: 'Инвентаризация', sub: 'Пересчёт остатков', icon: ClipboardCheck, to: '/document?type=inventory', color: C.brand, g: 'Документы' },
  // Разделы (переход)
  { perm: 'delivery', label: 'Доставка', sub: 'Маршрут и карта', icon: Navigation, to: '/delivery', color: C.warn, g: 'Разделы' },
  { perm: 'products', label: 'Товары', sub: 'Каталог, остатки', icon: Package, to: '/products', color: C.ok, g: 'Разделы' },
  { perm: 'warehouse', label: 'Карта склада', sub: 'Ячейки и поиск', icon: Warehouse, to: '/warehouse', color: C.info, g: 'Разделы' },
  { perm: 'storefront', label: 'Витрина', sub: 'Заказ с доставкой', icon: Store, to: '/storefront', color: C.ok, g: 'Разделы' },
  { perm: 'customers', label: 'Клиенты', sub: 'Долги и оплаты', icon: UserSquare2, to: '/customers', color: C.info, g: 'Разделы' },
]

const GROUPS = ['Документы', 'Разделы']

export default function NewOp() {
  const me = useStore((s) => s.employees.find((e) => e.id === s.authUserId))
  const role = roleInfo(me?.role || 'admin')
  const ops = OPS.filter((o) => canAccess(role.key, o.perm))

  const go = (to) => {
    router.back()
    setTimeout(() => router.push(to), 60)
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 h-14">
        <Text className="text-ink text-xl font-bold">Создать</Text>
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <X size={22} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}>
        {GROUPS.map((g) => {
          const items = ops.filter((o) => o.g === g)
          if (!items.length) return null
          return (
            <View key={g} className="mb-4">
              <Text className="text-muted text-[13px] font-medium mb-2 px-1">{g}</Text>
              {items.map((o) => (
                <Pressable
                  key={o.label}
                  onPress={() => go(o.to)}
                  className="flex-row items-center bg-surface rounded-2xl border border-line p-3.5 mb-2 active:opacity-80"
                >
                  <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: o.color + '22' }}>
                    <o.icon size={22} color={o.color} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-ink font-semibold text-[15px]">{o.label}</Text>
                    <Text className="text-muted text-[12px] mt-0.5">{o.sub}</Text>
                  </View>
                  <ChevronRight size={20} color={C.muted} />
                </Pressable>
              ))}
            </View>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
