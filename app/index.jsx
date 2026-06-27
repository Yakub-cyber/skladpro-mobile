import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '../store/useStore'
import { C } from '../components/ui'

export default function Index() {
  const initAuth = useStore((s) => s.initAuth)
  const sessionChecked = useStore((s) => s.sessionChecked)
  const authUserId = useStore((s) => s.authUserId)
  const needOnboarding = useStore((s) => s.needOnboarding)

  useEffect(() => {
    initAuth()
  }, [])

  useEffect(() => {
    if (!sessionChecked) return
    if (needOnboarding) router.replace('/onboarding')
    else if (authUserId) router.replace('/(tabs)')
    else router.replace('/login')
  }, [sessionChecked, authUserId, needOnboarding])

  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <View className="h-16 w-16 rounded-2xl bg-brand items-center justify-center mb-5">
        <Text className="text-brand-ink text-3xl font-bold">С</Text>
      </View>
      <ActivityIndicator color={C.brand} />
    </View>
  )
}
