import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Modal, Alert } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft, Mail, UserPlus, Clock, Trash2, X } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { loadMembers, loadInvites, inviteMember, revokeInvite } from '../lib/cloud'
import { Screen, Card, Avatar, Badge, Btn, Input, Field, Empty, C } from '../components/ui'
import { ROLES, roleInfo } from '../lib/constants'

export default function Team() {
  const companyId = useStore((s) => s.companyId)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [inviteOpen, setInviteOpen] = useState(false)

  const refresh = () => {
    loadMembers().then(setMembers).catch(() => {})
    loadInvites().then(setInvites).catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">Команда</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Приглашения */}
        <View className="flex-row items-center justify-between mb-2.5">
          <Text className="text-ink font-semibold">Приглашения</Text>
          <Btn title="Пригласить" icon={UserPlus} size="sm" onPress={() => setInviteOpen(true)} />
        </View>
        {invites.length === 0 ? (
          <Card className="mb-5">
            <Empty title="Нет приглашений" text="Пригласите сотрудника по email" icon={Mail} />
          </Card>
        ) : (
          <View className="mb-5">
            {invites.map((inv) => {
              const r = roleInfo(inv.role)
              return (
                <Card key={inv.id} className="p-3.5 mb-2 flex-row items-center">
                  <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: C.brand + '22' }}>
                    <Mail size={18} color={C.brand} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{inv.email}</Text>
                    <View className="flex-row items-center mt-0.5">
                      <Clock size={11} color={C.muted} />
                      <Text className="text-muted text-[12px] ml-1">Ожидает регистрации</Text>
                    </View>
                  </View>
                  <Badge color={r.color}>{r.label}</Badge>
                  <Pressable onPress={() => revokeInvite(inv.id).then(refresh)} className="ml-2 h-9 w-9 items-center justify-center">
                    <Trash2 size={17} color={C.muted} />
                  </Pressable>
                </Card>
              )
            })}
          </View>
        )}

        {/* Участники */}
        <Text className="text-ink font-semibold mb-2.5">Участники · {members.length}</Text>
        {members.map((m) => {
          const r = roleInfo(m.role)
          return (
            <Card key={m.user_id} className="p-3.5 mb-2 flex-row items-center">
              <Avatar name={m.name || 'Сотрудник'} color={r.color} size={40} />
              <View className="flex-1 ml-3">
                <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{m.name || 'Без имени'}</Text>
                <Text className="text-muted text-[12px]">{m.active ? 'Активен' : 'Отключён'}</Text>
              </View>
              <Badge color={r.color}>{r.label}</Badge>
            </Card>
          )
        })}
      </ScrollView>

      <InviteModal open={inviteOpen} onClose={() => { setInviteOpen(false); refresh() }} companyId={companyId} />
    </Screen>
  )
}

function InviteModal({ open, onClose, companyId }) {
  const [f, setF] = useState({ email: '', name: '', role: 'stock' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Укажите корректный email')
    setBusy(true)
    setErr('')
    const r = await inviteMember(companyId, f.email, f.role, f.name)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    setF({ email: '', name: '', role: 'stock' })
    onClose()
    Alert.alert('Готово', 'Приглашение создано. Сотрудник зарегистрируется на этот email и войдёт в компанию.')
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-surface rounded-t-3xl p-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-ink text-lg font-bold">Пригласить сотрудника</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center">
              <X size={22} color={C.muted} />
            </Pressable>
          </View>
          <Field label="Email сотрудника">
            <Input value={f.email} onChangeText={(v) => set('email', v)} placeholder="ivan@mail.ru" keyboardType="email-address" />
          </Field>
          <Field label="Имя (необязательно)">
            <Input value={f.name} onChangeText={(v) => set('name', v)} placeholder="Иван" autoCapitalize="words" />
          </Field>
          <Field label="Роль">
            <View className="flex-row flex-wrap gap-2">
              {ROLES.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => set('role', r.key)}
                  className={`px-3 h-10 rounded-xl items-center justify-center border ${f.role === r.key ? 'bg-brand border-brand' : 'bg-surface-2 border-line'}`}
                >
                  <Text className={`text-[13px] font-medium ${f.role === r.key ? 'text-brand-ink' : 'text-muted'}`}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
          {err ? <Text className="text-bad text-[13px] mb-2">{err}</Text> : null}
          <Btn title={busy ? 'Отправляем…' : 'Пригласить'} icon={UserPlus} onPress={submit} loading={busy} className="mt-2" />
        </View>
      </View>
    </Modal>
  )
}
