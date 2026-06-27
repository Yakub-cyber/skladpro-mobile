import { View, Text, ScrollView } from 'react-native'
import { Package, ClipboardList, TrendingUp, AlertTriangle } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { Screen, Card, Avatar, C } from '../../components/ui'
import { money } from '../../lib/format'
import { roleInfo } from '../../lib/constants'

function Metric({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex-1 p-3.5">
      <View className="h-9 w-9 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: color + '22' }}>
        <Icon size={18} color={color} />
      </View>
      <Text className="text-ink text-lg font-bold" numberOfLines={1}>{value}</Text>
      <Text className="text-muted text-[12px]">{label}</Text>
    </Card>
  )
}

export default function Dashboard() {
  const { orders, products, customers, employees, authUserId, companyName } = useStore()
  const me = employees.find((e) => e.id === authUserId)
  const role = roleInfo(me?.role || 'admin')

  const inWork = orders.filter((o) => ['new', 'confirmed', 'picking', 'packed'].includes(o.status)).length
  const revenue = orders.filter((o) => o.status === 'delivered').reduce((a, o) => a + (o.total || 0), 0)
  const lowStock = products.filter((p) => p.stock <= p.minStock).length
  const debt = customers.reduce((a, c) => a + Math.max(0, -(c.balance || 0)), 0)
  const recent = [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 6)

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Шапка */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1">
            <Text className="text-muted text-[13px]">{companyName || 'Компания'}</Text>
            <Text className="text-ink text-xl font-bold">Привет, {me?.name?.split(' ')[0] || 'Сотрудник'}</Text>
          </View>
          <Avatar name={me?.name || '?'} color={role.color} size={44} />
        </View>

        {/* Метрики */}
        <View className="flex-row gap-3 mb-3">
          <Metric icon={ClipboardList} label="Заказов в работе" value={inWork} color={C.brand} />
          <Metric icon={TrendingUp} label="Выручка" value={money(revenue)} color={C.ok} />
        </View>
        <View className="flex-row gap-3 mb-5">
          <Metric icon={AlertTriangle} label="Низкий остаток" value={lowStock} color={C.warn} />
          <Metric icon={Package} label="Дебиторка" value={money(debt)} color={C.info} />
        </View>

        {/* Последние заказы */}
        <Text className="text-ink font-semibold mb-2.5">Последние заказы</Text>
        <Card className="overflow-hidden">
          {recent.map((o, i) => (
            <View key={o.id} className={`flex-row items-center px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <View className="flex-1">
                <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{o.customerName}</Text>
                <Text className="text-muted text-[12px]">{o.no}</Text>
              </View>
              <Text className="text-ink text-[14px] font-semibold">{money(o.total)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  )
}
