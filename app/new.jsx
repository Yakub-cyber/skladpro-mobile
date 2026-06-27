import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { X, ScanLine, ClipboardList, Navigation, Package, UserSquare2, ChevronRight, Sparkles, Warehouse, Store } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, C } from '../components/ui'
import { roleInfo, canAccess } from '../lib/constants'

const OPS = [
  { perm: 'orders', label: 'Продажа', sub: 'Касса, сканер штрихкодов', icon: ScanLine, to: '/pos', color: C.brand },
  { perm: 'orders', label: 'Заказы', sub: 'Оформление и статусы', icon: ClipboardList, to: '/orders', color: C.info },
  { perm: 'invoices', label: 'ИИ-накладная', sub: 'Приёмка из текста', icon: Sparkles, to: '/invoice', color: C.brand },
  { perm: 'delivery', label: 'Доставка', sub: 'Маршрут и отметки', icon: Navigation, to: '/delivery', color: C.warn },
  { perm: 'products', label: 'Товары и приёмка', sub: 'Остатки, приёмка, списание', icon: Package, to: '/products', color: C.ok },
  { perm: 'warehouse', label: 'Карта склада', sub: 'Ячейки и поиск товара', icon: Warehouse, to: '/warehouse', color: C.info },
  { perm: 'storefront', label: 'Витрина', sub: 'Заказ с доставкой', icon: Store, to: '/storefront', color: C.ok },
  { perm: 'customers', label: 'Клиенты', sub: 'Долги и оплаты', icon: UserSquare2, to: '/customers', color: C.info },
]

export default function NewOp() {
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const role = roleInfo(useStore((s) => s.employees.find((e) => e.id === s.authUserId))?.role || 'admin')
  const ops = OPS.filter((o) => canAccess(role.key, o.perm))

  const go = (to) => {
    router.back()
    setTimeout(() => router.push(to), 50)
  }

  return (
    <Screen>
      <View className="flex-row items-center justify-between px-4 h-14">
        <Text className="text-ink text-xl font-bold">Создать</Text>
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-surface-2">
          <X size={22} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}>
        {ops.map((o) => (
          <Pressable
            key={o.label}
            onPress={() => go(o.to)}
            className="flex-row items-center bg-surface rounded-2xl border border-line p-4 mb-3 active:opacity-80"
          >
            <View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: o.color + '22' }}>
              <o.icon size={24} color={o.color} />
            </View>
            <View className="flex-1 ml-3.5">
              <Text className="text-ink font-semibold text-[16px]">{o.label}</Text>
              <Text className="text-muted text-[13px] mt-0.5">{o.sub}</Text>
            </View>
            <ChevronRight size={20} color={C.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  )
}
