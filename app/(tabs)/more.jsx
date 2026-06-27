import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native'
import { router } from 'expo-router'
import { LogOut, ShieldCheck, Building2, Mail, KeyRound, Users, ChevronRight, X, UserSquare2, History, BarChart3 } from 'lucide-react-native'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { changePassword } from '../../lib/cloud'
import { Screen, Card, Avatar, Badge, Btn, Input, Field, C } from '../../components/ui'
import { roleInfo, canAccess } from '../../lib/constants'

export default function More() {
  const employees = useStore((s) => s.employees)
  const authUserId = useStore((s) => s.authUserId)
  const companyName = useStore((s) => s.companyName)
  const cloudLogout = useStore((s) => s.cloudLogout)
  const me = employees.find((e) => e.id === authUserId)
  const role = roleInfo(me?.role || 'admin')
  const [email, setEmail] = useState('')
  const [pwOpen, setPwOpen] = useState(false)

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

        {/* Разделы */}
        {(() => {
          const sections = [
            { perm: 'customers', icon: UserSquare2, label: 'Клиенты и долги', to: '/customers' },
            { perm: 'orders', icon: History, label: 'История', to: '/history' },
            { perm: 'analytics', icon: BarChart3, label: 'Аналитика', to: '/analytics' },
          ].filter((s) => canAccess(me?.role, s.perm))
          if (!sections.length) return null
          return (
            <Card className="overflow-hidden mb-4">
              {sections.map((s, i) => (
                <Action key={s.to} icon={s.icon} label={s.label} onPress={() => router.push(s.to)} border={i > 0} />
              ))}
            </Card>
          )
        })()}

        {/* Действия */}
        <Card className="overflow-hidden mb-4">
          {canAccess(me?.role, 'employees') && (
            <Action icon={Users} label="Команда и приглашения" onPress={() => router.push('/team')} />
          )}
          <Action icon={KeyRound} label="Сменить пароль" onPress={() => setPwOpen(true)} border={canAccess(me?.role, 'employees')} />
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

      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
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

function Action({ icon: Icon, label, onPress, border }) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center px-4 py-3.5 active:bg-surface-2 ${border ? 'border-t border-line' : ''}`}>
      <Icon size={18} color={C.brand} />
      <Text className="text-ink text-[14px] ml-3 flex-1">{label}</Text>
      <ChevronRight size={18} color={C.muted} />
    </Pressable>
  )
}

function PasswordModal({ open, onClose }) {
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (pass.length < 6) return setErr('Минимум 6 символов')
    if (pass !== pass2) return setErr('Пароли не совпадают')
    setBusy(true)
    setErr('')
    const r = await changePassword(pass)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    setPass('')
    setPass2('')
    onClose()
    Alert.alert('Готово', 'Пароль изменён')
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-bold">Сменить пароль</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <Field label="Новый пароль" hint="Минимум 6 символов">
            <Input value={pass} onChangeText={setPass} placeholder="••••••••" secureTextEntry />
          </Field>
          <Field label="Повторите пароль">
            <Input value={pass2} onChangeText={setPass2} placeholder="••••••••" secureTextEntry />
          </Field>
          {err ? <Text className="text-bad text-[13px] mb-2">{err}</Text> : null}
          <Btn title={busy ? 'Сохраняем…' : 'Сохранить'} onPress={save} loading={busy} className="mt-2" />
        </View>
      </View>
    </Modal>
  )
}
