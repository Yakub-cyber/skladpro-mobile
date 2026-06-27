import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Палитра в JS (для иконок и динамических стилей) — синхронно с tailwind.config
export const C = {
  bg: '#0B0F1A',
  surface: '#121826',
  surface2: '#1A2233',
  surface3: '#232E44',
  line: '#2A3650',
  ink: '#E7ECF5',
  muted: '#8A97B0',
  brand: '#6366F1',
  brandInk: '#FFFFFF',
  ok: '#22C55E',
  bad: '#EF4444',
  warn: '#F59E0B',
  info: '#38BDF8',
}

// Имя тона ('info'/'warn'/'brand'/'ok'/'bad') → hex из палитры
export const tone = (name) => C[name] || C.brand

// Обёртка экрана с безопасной зоной
export function Screen({ children, className = '', edges = ['top'] }) {
  return (
    <SafeAreaView edges={edges} className={`flex-1 bg-bg ${className}`}>
      {children}
    </SafeAreaView>
  )
}

// Кнопка
export function Btn({ title, children, onPress, variant = 'primary', size = 'md', icon: Icon, loading, disabled, className = '' }) {
  const base = 'flex-row items-center justify-center rounded-xl'
  const sizes = { sm: 'h-9 px-3', md: 'h-12 px-4', lg: 'h-14 px-5' }
  const variants = {
    primary: 'bg-brand',
    soft: 'bg-surface-2',
    ghost: 'bg-transparent',
    bad: 'bg-bad',
  }
  const textColor = {
    primary: 'text-brand-ink',
    soft: 'text-ink',
    ghost: 'text-muted',
    bad: 'text-white',
  }
  const dim = disabled || loading
  return (
    <Pressable
      onPress={dim ? undefined : onPress}
      className={`${base} ${sizes[size]} ${variants[variant]} ${dim ? 'opacity-50' : 'active:opacity-80'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : C.muted} size="small" />
      ) : (
        <>
          {Icon && <Icon size={18} color={variant === 'primary' || variant === 'bad' ? '#fff' : C.muted} />}
          <Text className={`font-semibold text-[15px] ${textColor[variant]} ${Icon ? 'ml-2' : ''}`}>
            {title || children}
          </Text>
        </>
      )}
    </Pressable>
  )
}

// Поле ввода
export function Input({ value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'none', className = '', ...rest }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      className={`h-12 px-3.5 rounded-xl bg-surface-2 border border-line text-ink text-[15px] ${className}`}
      {...rest}
    />
  )
}

// Поле с подписью
export function Field({ label, hint, children }) {
  return (
    <View className="mb-3">
      <Text className="text-muted text-[13px] mb-1.5">{label}</Text>
      {children}
      {hint ? <Text className="text-muted text-[11px] mt-1">{hint}</Text> : null}
    </View>
  )
}

// Карточка
export function Card({ children, className = '' }) {
  return <View className={`bg-surface rounded-2xl border border-line ${className}`}>{children}</View>
}

// Бейдж
export function Badge({ children, color = C.brand }) {
  return (
    <View className="px-2 py-0.5 rounded-md self-start" style={{ backgroundColor: color + '22' }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {children}
      </Text>
    </View>
  )
}

// Аватар с инициалами
export function Avatar({ name = '?', color = C.brand, size = 40 }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '33' }} className="items-center justify-center">
      <Text style={{ color, fontSize: size * 0.4 }} className="font-bold">
        {initials}
      </Text>
    </View>
  )
}

// Пустое состояние
export function Empty({ title, text, icon: Icon }) {
  return (
    <View className="items-center justify-center py-16 px-6">
      {Icon && <Icon size={36} color={C.muted} />}
      <Text className="text-ink font-semibold mt-3">{title}</Text>
      {text ? <Text className="text-muted text-[13px] mt-1 text-center">{text}</Text> : null}
    </View>
  )
}

// KPI-карточка (как Stat на сайте): иконка в цветном квадрате + label/value/sub/trend
export function Stat({ label, value, sub, icon: Icon, color = C.brand, trend }) {
  return (
    <Card className="p-4 flex-row items-center">
      <View className="h-11 w-11 rounded-xl items-center justify-center" style={{ backgroundColor: color + '22' }}>
        {Icon && <Icon size={20} color={color} />}
      </View>
      <View className="flex-1 ml-3.5">
        <Text className="text-muted text-[13px]" numberOfLines={1}>{label}</Text>
        <Text className="text-ink text-[19px] font-bold leading-6" numberOfLines={1}>{value}</Text>
        {(sub || trend != null) && (
          <View className="flex-row items-center mt-0.5">
            {trend != null && (
              <Text className="text-[12px] mr-1" style={{ color: trend >= 0 ? C.ok : C.bad }}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
              </Text>
            )}
            {sub ? <Text className="text-muted text-[12px]" numberOfLines={1}>{sub}</Text> : null}
          </View>
        )}
      </View>
    </Card>
  )
}

// Секция-карточка с заголовком/подзаголовком/действием (как Section на сайте)
export function Section({ title, subtitle, action, children, className = '' }) {
  return (
    <Card className={`p-4 ${className}`}>
      {(title || action) && (
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-2">
            {title ? <Text className="text-ink font-semibold text-[15px]">{title}</Text> : null}
            {subtitle ? <Text className="text-muted text-[13px] mt-0.5">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </Card>
  )
}
