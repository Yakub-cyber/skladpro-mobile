import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Boxes } from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { requestPasswordReset } from '../lib/cloud'
import { Screen, Btn, Input, Field, C } from '../components/ui'

export default function Login() {
  const signIn = useStore((s) => s.signIn)
  const signUp = useStore((s) => s.signUp)
  const [mode, setMode] = useState('signin') // signin | signup | forgot
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const submit = async () => {
    setErr('')
    setInfo('')
    if (mode === 'forgot') {
      if (!email) return setErr('Введите email')
      setBusy(true)
      const r = await requestPasswordReset(email)
      setBusy(false)
      if (r.ok) setInfo(`Ссылка для сброса отправлена на ${email}`)
      else setErr(r.error)
      return
    }
    if (!email || !pass) return setErr('Заполните email и пароль')
    setBusy(true)
    const r = mode === 'signin' ? await signIn(email, pass) : await signUp(email, pass, name)
    if (!r.ok) {
      setErr(r.error)
      setBusy(false)
    } else if (r.needConfirm) {
      setInfo('Аккаунт создан. Подтвердите email по ссылке из письма, затем войдите.')
      setMode('signin')
      setBusy(false)
    } else {
      router.replace('/')
    }
  }

  return (
    <Screen className="px-6">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="h-16 w-16 rounded-2xl bg-brand items-center justify-center mb-3">
              <Boxes size={32} color="#fff" />
            </View>
            <Text className="text-ink text-2xl font-bold">
              Склад<Text className="text-brand">Про</Text>
            </Text>
            <Text className="text-muted text-[13px] mt-1">Облачный складской учёт</Text>
          </View>

          {mode !== 'forgot' && (
            <View className="flex-row bg-surface-2 rounded-xl p-1 mb-5">
              {[
                ['signin', 'Вход'],
                ['signup', 'Регистрация'],
              ].map(([m, label]) => (
                <Pressable
                  key={m}
                  onPress={() => { setMode(m); setErr(''); setInfo('') }}
                  className={`flex-1 h-10 rounded-lg items-center justify-center ${mode === m ? 'bg-brand' : ''}`}
                >
                  <Text className={`text-[14px] font-semibold ${mode === m ? 'text-brand-ink' : 'text-muted'}`}>{label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {mode === 'forgot' && <Text className="text-ink font-semibold text-lg mb-3">Восстановление пароля</Text>}

          {mode === 'signup' && (
            <Field label="Имя">
              <Input value={name} onChangeText={setName} placeholder="Ваше имя" autoCapitalize="words" />
            </Field>
          )}
          <Field label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="mail@example.ru" keyboardType="email-address" />
          </Field>
          {mode !== 'forgot' && (
            <Field label="Пароль" hint={mode === 'signup' ? 'Минимум 6 символов' : undefined}>
              <Input value={pass} onChangeText={setPass} placeholder="••••••••" secureTextEntry />
            </Field>
          )}

          {err ? <Text className="text-bad text-[13px] mb-2">{err}</Text> : null}
          {info ? <Text className="text-ok text-[13px] mb-2">{info}</Text> : null}

          <Btn
            title={busy ? 'Подождите…' : mode === 'signin' ? 'Войти' : mode === 'signup' ? 'Создать аккаунт' : 'Отправить ссылку'}
            onPress={submit}
            loading={busy}
            className="mt-2"
          />

          {mode === 'signin' && (
            <Pressable onPress={() => { setMode('forgot'); setErr(''); setInfo('') }} className="mt-4">
              <Text className="text-muted text-[13px] text-center">Забыли пароль?</Text>
            </Pressable>
          )}
          {mode === 'forgot' && (
            <Pressable onPress={() => { setMode('signin'); setErr(''); setInfo('') }} className="mt-4">
              <Text className="text-muted text-[13px] text-center">← Назад ко входу</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
