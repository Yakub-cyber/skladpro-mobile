import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import {
  Package, ClipboardList, TrendingUp, AlertTriangle, ScanLine, Navigation, Wallet, ChevronRight,
} from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Avatar, C } from '../../components/ui'
import { money } from '../../lib/format'
import { roleInfo, canAccess } from '../../lib/constants'

const ACTIONS = [
  { perm: 'orders', label: 'Касса', icon: ScanLine, to: '/pos', color: C.brand, hideCourier: true },
  { perm: 'orders', label: 'Заказы', icon: ClipboardList, to: '/orders', color: C.info },
  { perm: 'products', label: 'Товары', icon: Package, to: '/products', color: C.ok },
  { perm: 'delivery', label: 'Доставка', icon: Navigation, to: '/delivery', color: C.warn },
]

function Metric({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex-1 p-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-muted text-[12px]" numberOfLines={1}>{label}</Text>
        <Icon size={15} color={color} />
      </View>
      <Text className="text-ink text-lg font-bold" numberOfLines={1}>{value}</Text>
    </Card>
  )
}

export default function Dashboard() {
  const { orders, products, customers, employees, authUserId, companyName } = useStore()
  const me = employees.find((e) => e.id === authUserId)
  const role = roleInfo(me?.role || 'admin')
  const isCourier = me?.role === 'courier'

  const inWork = orders.filter((o) => ['new', 'confirmed', 'picking', 'packed'].includes(o.status)).length
  const revenue = orders.filter((o) => o.status === 'delivered').reduce((a, o) => a + (o.total || 0), 0)
  const lowStock = products.filter((p) => p.stock <= p.minStock).length
  const debt = customers.reduce((a, c) => a + Math.max(0, c.balance || 0), 0)
  const recent = [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5)

  const actions = ACTIONS.filter((a) => canAccess(role.key, a.perm) && !(a.hideCourier && isCourier))

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Шапка */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1">
            <Text className="text-muted text-[13px]">{companyName || 'Компания'}</Text>
            <Text className="text-ink text-xl font-bold">Привет, {me?.name?.split(' ')[0] || 'Сотрудник'}</Text>
          </View>
          <Pressable onPress={() => router.push('/more')}>
            <Avatar name={me?.name || '?'} color={role.color} size={44} />
          </Pressable>
        </View>

        {/* Быстрые действия */}
        <View className="flex-row flex-wrap -mx-1 mb-5">
          {actions.map((a) => (
            <View key={a.label} className="w-1/2 px-1 mb-2">
              <Pressable
                onPress={() => router.push(a.to)}
                className="bg-surface rounded-2xl border border-line p-4 active:opacity-80"
              >
                <View className="h-12 w-12 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: a.color + '22' }}>
                  <a.icon size={24} color={a.color} />
                </View>
                <Text className="text-ink font-semibold text-[15px]">{a.label}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Метрики */}
        <Text className="text-ink font-semibold mb-2.5">Сводка</Text>
        <View className="flex-row gap-3 mb-3">
          <Metric icon={ClipboardList} label="В работе" value={inWork} color={C.brand} />
          <Metric icon={TrendingUp} label="Выручка" value={money(revenue)} color={C.ok} />
        </View>
        <View className="flex-row gap-3 mb-5">
          <Metric icon={AlertTriangle} label="Низкий остаток" value={lowStock} color={C.warn} />
          <Metric icon={Wallet} label="Дебиторка" value={money(debt)} color={C.info} />
        </View>

        {/* Последние заказы */}
        <Text className="text-ink font-semibold mb-2.5">Последние заказы</Text>
        <Card className="overflow-hidden">
          {recent.map((o, i) => (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/order/${o.id}`)}
              className={`flex-row items-center px-4 py-3 active:bg-surface-2 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{o.customerName}</Text>
                <Text className="text-muted text-[12px]">{o.no}</Text>
              </View>
              <Text className="text-ink text-[14px] font-semibold mr-1.5">{money(o.total)}</Text>
              <ChevronRight size={16} color={C.muted} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  )
}
