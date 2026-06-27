import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'

// Показывать уведомления и когда приложение на переднем плане
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let inited = false
export async function initPush() {
  if (inited) return
  inited = true
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') await Notifications.requestPermissionsAsync()
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Уведомления',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
      })
    }
  } catch {}
}

// FCM-токен устройства (для push на закрытое приложение — этап 2).
// Работает только в standalone-сборке с google-services.json (Firebase).
export async function getDeviceToken() {
  if (!Device.isDevice || Platform.OS === 'web') return null
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return null
    const token = await Notifications.getDevicePushTokenAsync()
    return token?.data || null
  } catch {
    return null
  }
}

// Локальный показ уведомления (срабатывает на realtime-событие, пока приложение живо)
export async function notify(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    })
  } catch {}
}
