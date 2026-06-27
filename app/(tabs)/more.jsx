import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { router } from 'expo-router'
import { LogOut, ShieldCheck, Building2, Mail } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { Screen, Card, Avatar, Badge, C } from '../../components/ui'
import { roleInfo } from '../../lib/constants'
import { useEffect, useState } from 'react'

export default function More() {
  const { employees, authUserId, companyName, cloudLogout } = useStore()
  const me = employees.find((e) => e.id === authUserId)
  const role = roleInfo(me?.role || 'admin')
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''))
  }, [])

  const logout = async () => {
    await cloudLogout()
    router.replace('/login')
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text className="text-ink text-xl font-bold mb-4">Профиль</Text>

        <Card className="p-5 items-center mb-4">
          <Avatar name={me?.name || '?'} color={role.color} size={64} />
          <Text className="text-ink text-lg font-bold mt-3">{me?.name || 'Сотрудник'}</Text>
          <View className="mt-1.5">
            <Badge color={role.color}>{role.label}</Badge>
          </View>
        </Card>

        <Card className="overflow-hidden mb-4">
          <Row icon={Building2} label="Компания" value={companyName || '—'} />
          <Row icon={Mail} label="Email" value={email || '—'} border />
          <Row icon={ShieldCheck} label="Роль" value={role.label} border />
        </Card>

        <Pressable
          onPress={logout}
          className="flex-row items-center justify-center h-12 rounded-xl bg-surface-2 active:opacity-80"
        >
          <LogOut size={18} color={C.bad} />
          <Text className="text-bad font-semibold text-[15px] ml-2">Выйти из системы</Text>
        </Pressable>

        <Text className="text-muted text-[12px] text-center mt-6">СкладПро · мобильное приложение</Text>
      </ScrollView>
    </Screen>
  )
}

function Row({ icon: Icon, label, value, border }) {
  return (
    <View className={`flex-row items-center px-4 py-3.5 ${border ? 'border-t border-line' : ''}`}>
      <Icon size={18} color={C.muted} />
      <Text className="text-muted text-[14px] ml-3 flex-1">{label}</Text>
      <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{value}</Text>
    </View>
  )
}
