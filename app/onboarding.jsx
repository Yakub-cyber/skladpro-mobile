import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Building2, LogOut } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Btn, Input, Field } from '../components/ui'

export default function Onboarding() {
  const createCompany = useStore((s) => s.createCompany)
  const cloudLogout = useStore((s) => s.cloudLogout)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!name.trim()) return setErr('Введите название компании')
    setBusy(true)
    setErr('')
    const r = await createCompany(name.trim())
    if (!r.ok) {
      setErr(r.error)
      setBusy(false)
    } else {
      router.replace('/')
    }
  }

  const logout = async () => {
    await cloudLogout()
    router.replace('/login')
  }

  return (
    <Screen className="px-6">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-center">
        <View className="items-center mb-7">
          <View className="h-16 w-16 rounded-2xl bg-brand items-center justify-center mb-3">
            <Building2 size={30} color="#fff" />
          </View>
          <Text className="text-ink text-xl font-bold">Создайте компанию</Text>
          <Text className="text-muted text-[13px] mt-1 text-center px-4">
            Это ваше рабочее пространство — данные видны только вашим сотрудникам.
          </Text>
        </View>

        <Field label="Название компании">
          <Input value={name} onChangeText={setName} placeholder="Напр. «СтройОпт» или ИП Иванов" autoCapitalize="sentences" />
        </Field>
        {err ? <Text className="text-bad text-[13px] mb-2">{err}</Text> : null}

        <Btn title={busy ? 'Создаём…' : 'Создать и начать'} icon={Building2} onPress={submit} loading={busy} className="mt-2" />

        <Pressable onPress={logout} className="mt-4 flex-row items-center justify-center">
          <LogOut size={14} color="#8A97B0" />
          <Text className="text-muted text-[13px] ml-1.5">Выйти</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  )
}
