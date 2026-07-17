import { View, Text, Pressable } from 'react-native'
import { Minus, Plus, Trash2 } from 'lucide-react-native'
import { catInfo } from '../lib/constants'
import { money, num } from '../lib/format'
import { C } from './ui'

// Плитка товара с inline-контролом qty. Используется в pos.jsx и
// order-new.jsx. Раньше в обеих плитках при тапе только увеличивалось
// qty, а уменьшить/удалить прямо на плитке было нельзя — приходилось
// открывать корзину. Теперь при qty>0 вместо кнопки цены — ряд
// [−] N [+] и Trash-иконка в углу.
//
// price приходит извне (в order-new — priceFor(p, priceTypeId клиента),
// в pos — обычная p.price), чтобы компонент не тянул priceTypes.
export default function ProductTile({ product, qty, price, onInc, onDec, onRemove }) {
  const p = product
  const ci = catInfo(p.category)
  const active = qty > 0
  const p2 = price ?? p.price

  return (
    <Pressable
      onPress={() => onInc?.(p)}
      className="rounded-2xl p-3 active:opacity-80"
      style={{
        height: 140,
        backgroundColor: ci.color + '14',
        borderWidth: 1,
        borderColor: active ? ci.color : ci.color + '33',
      }}
    >
      {active && onRemove && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onRemove(p) }}
          hitSlop={8}
          className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full items-center justify-center z-10"
          style={{ backgroundColor: '#00000055' }}
        >
          <Trash2 size={13} color="#fff" />
        </Pressable>
      )}
      <View className="flex-1 justify-between">
        <Text className="text-ink text-[13px] font-medium leading-[17px]" numberOfLines={2}>{p.name}</Text>
        {active ? (
          <View>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onDec?.(p) }}
                hitSlop={6}
                className="h-8 w-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: '#ffffff33' }}
              >
                <Minus size={16} color={ci.color} />
              </Pressable>
              <Text className="text-ink font-bold text-[16px]">{num(qty)}</Text>
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onInc?.(p) }}
                hitSlop={6}
                className="h-8 w-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: ci.color }}
              >
                <Plus size={16} color="#fff" />
              </Pressable>
            </View>
            <Text className="text-muted text-[11px] mt-1 text-center">{money(p2 * qty)}</Text>
          </View>
        ) : (
          <View>
            <Text className="font-bold text-[15px]" style={{ color: ci.color }}>{money(p2)}</Text>
            <Text className="text-muted text-[11px]">{num(p.stock)} {p.unit}</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}
