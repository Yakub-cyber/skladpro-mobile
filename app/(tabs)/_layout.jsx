import { Tabs, router } from 'expo-router'
import { View, Pressable } from 'react-native'
import { LayoutDashboard, ClipboardList, Navigation, Package, Menu, Plus } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { canAccess } from '../../lib/constants'
import { C } from '../../components/ui'

// Центральная приподнятая кнопка «+» — единый вход во все операции (как в CloudShop)
function CenterPlus() {
  return (
    <Pressable onPress={() => router.push('/new')} className="flex-1 items-center justify-center">
      <View
        className="absolute h-14 w-14 rounded-full bg-brand items-center justify-center"
        style={{ bottom: 4, shadowColor: C.brand, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 }}
      >
        <Plus size={28} color="#fff" strokeWidth={2.4} />
      </View>
    </Pressable>
  )
}

export default function TabsLayout() {
  const employees = useStore((s) => s.employees) || []
  const authUserId = useStore((s) => s.authUserId)
  const me = employees.find((e) => e.id === authUserId)
  const role = me?.role || 'admin'
  const isCourier = role === 'courier'

  const tabBarStyle = {
    backgroundColor: C.surface,
    borderTopColor: C.line,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  }
  const screenOptions = {
    headerShown: false,
    tabBarStyle,
    tabBarActiveTintColor: C.brand,
    tabBarInactiveTintColor: C.muted,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  }

  const icon = (Icon) => ({ color, size }) => <Icon size={size - 2} color={color} />

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon(LayoutDashboard) }} />
      <Tabs.Screen name="orders" options={{ title: 'Заказы', tabBarIcon: icon(ClipboardList) }} />
      {/* Центральная «+» — открывает экран операций (скрыта для курьера) */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarButton: isCourier ? () => null : (props) => <CenterPlus {...props} />,
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{ title: 'Доставка', tabBarIcon: icon(Navigation), href: isCourier ? '/delivery' : null }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Товары', tabBarIcon: icon(Package), href: canAccess(role, 'products') && !isCourier ? '/products' : null }}
      />
      <Tabs.Screen name="more" options={{ title: 'Ещё', tabBarIcon: icon(Menu) }} />
    </Tabs>
  )
}
