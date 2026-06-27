import { Tabs } from 'expo-router'
import { LayoutDashboard, ClipboardList, Navigation, Package, Menu } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { canAccess } from '../../lib/constants'
import { C } from '../../components/ui'

const TABS = [
  { name: 'index', title: 'Главная', perm: 'dashboard', icon: LayoutDashboard },
  { name: 'orders', title: 'Заказы', perm: 'orders', icon: ClipboardList },
  { name: 'delivery', title: 'Доставка', perm: 'delivery', icon: Navigation },
  { name: 'products', title: 'Товары', perm: 'products', icon: Package },
  { name: 'more', title: 'Ещё', perm: null, icon: Menu },
]

export default function TabsLayout() {
  const employees = useStore((s) => s.employees) || []
  const authUserId = useStore((s) => s.authUserId)
  const me = employees.find((e) => e.id === authUserId)
  const role = me?.role || 'admin'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TABS.map((t) => {
        const allowed = t.perm === null || canAccess(role, t.perm)
        return (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarIcon: ({ color, size }) => <t.icon size={size - 2} color={color} />,
              href: allowed ? undefined : null,
            }}
          />
        )
      })}
    </Tabs>
  )
}
