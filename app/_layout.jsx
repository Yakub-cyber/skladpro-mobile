import '../global.css'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import ErrorBoundary from '../components/ErrorBoundary'
import { initCrashReporter } from '../lib/crashReporter'

// Инициализируем Sentry при загрузке модуля. Без DSN — no-op.
initCrashReporter()

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0B0F1A' },
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
