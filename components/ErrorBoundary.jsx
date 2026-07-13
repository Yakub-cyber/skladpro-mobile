import { Component } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { captureException } from '../lib/crashReporter'

// Ловит render-ошибки любого React-дерева ниже: без бордера один необработанный
// throw валит всё приложение с белым экраном. Экран восстановления показывает
// stack (для отладки) и предлагает reset — сбрасывает своё состояние и пробует
// перерендерить дерево. Для нативных крашей нужен Sentry (JS-boundary их не ловит).
export default class ErrorBoundary extends Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Уйдёт в Sentry, если он подключён (см. lib/crashReporter.js).
    // Без Sentry — console.error, приложение работает как раньше.
    captureException(error, { componentStack: info?.componentStack })
  }

  reset = () => this.setState({ error: null, info: null })

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)
    const stack = this.state.info?.componentStack || this.state.error?.stack || ''

    return (
      <View style={{ flex: 1, backgroundColor: '#0B0F1A', padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#F87171', fontSize: 20, fontWeight: '600', marginBottom: 8 }}>
          Что-то пошло не так
        </Text>
        <Text style={{ color: '#E5E7EB', marginBottom: 16 }}>
          Приложение поймало сбой. Попробуй перезапустить экран — данные в облаке не потеряны.
        </Text>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#111827', padding: 12, borderRadius: 8, marginBottom: 16 }}
        >
          <Text style={{ color: '#F87171', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}>
            {msg}
          </Text>
          <Text style={{ color: '#9CA3AF', fontFamily: 'monospace', fontSize: 10 }}>
            {stack}
          </Text>
        </ScrollView>
        <Pressable
          onPress={this.reset}
          style={{ backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Перезапустить экран</Text>
        </Pressable>
      </View>
    )
  }
}
