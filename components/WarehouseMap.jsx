import { useMemo, useState } from 'react'
import { View } from 'react-native'
import Svg, { Rect, G, Text as SvgText, Circle } from 'react-native-svg'
import { GRID_W, GRID_H, ENTRANCE, RECEIVING } from '../lib/constants'
import { C } from './ui'

const U = 60
const S = 46
const ZONE = { A: '#f59e0b', B: '#f59e0b', C: '#7c6cff', D: '#7c6cff', E: '#38bdf8', F: '#10b981', G: '#f43f5e', H: '#94a3b8' }
const colorOf = (z) => ZONE[z] || '#94a3b8'
const hexA = (c, a) => c + Math.round(a * 255).toString(16).padStart(2, '0')

export function WarehouseMap({ cells = [], products = [], highlight = [], selected = null, onCellPress }) {
  const [w, setW] = useState(0)
  const W = GRID_W * U
  const H = GRID_H * U
  const height = w ? (H / W) * w : 0
  const hi = useMemo(() => new Set(highlight), [highlight])
  const byCell = useMemo(() => {
    const m = {}
    products.forEach((p) => { (m[p.cell] = m[p.cell] || []).push(p) })
    return m
  }, [products])

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {w > 0 && (
        <Svg width={w} height={height} viewBox={`0 0 ${W} ${H}`}>
          <Rect x={1} y={1} width={W - 2} height={H - 2} rx={14} fill={C.surface} stroke={C.line} strokeWidth={2} />
          <ServicePoint x={RECEIVING.x * U} y={RECEIVING.y * U} color="#38bdf8" />
          <ServicePoint x={ENTRANCE.x * U} y={ENTRANCE.y * U} color={C.brand} />
          {cells.map((c) => {
            const cx = c.x * U
            const cy = c.y * U
            const items = byCell[c.code] || []
            const isHi = hi.has(c.code) || hi.has(c.id)
            const isSel = selected === c.id
            const low = items.some((p) => p.stock <= p.minStock)
            const color = colorOf(c.zone)
            return (
              <G key={c.id} onPress={() => onCellPress?.(c)}>
                <Rect
                  x={cx - S / 2}
                  y={cy - S / 2}
                  width={S}
                  height={S}
                  rx={8}
                  fill={isHi ? color : hexA(color, 0.18)}
                  stroke={isSel ? C.brand : isHi ? '#ffffff' : color}
                  strokeWidth={isSel ? 3 : isHi ? 2.5 : 1.3}
                  strokeOpacity={isSel || isHi ? 1 : 0.55}
                />
                <SvgText x={cx} y={cy - 1} textAnchor="middle" fontSize={13} fontWeight="700" fill={isHi ? '#ffffff' : color}>{c.code}</SvgText>
                <SvgText x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill={isHi ? '#ffffff' : C.muted}>{items.length ? `${items.length} SKU` : '—'}</SvgText>
                {low && !isHi ? <Circle cx={cx + S / 2 - 6} cy={cy - S / 2 + 6} r={3.5} fill="#f43f5e" /> : null}
              </G>
            )
          })}
        </Svg>
      )}
    </View>
  )
}

function ServicePoint({ x, y, color }) {
  return (
    <G>
      <Rect x={x - S / 2} y={y - S / 2} width={S} height={S} rx={10} fill={hexA(color, 0.16)} stroke={color} strokeWidth={2} strokeDasharray="5 4" />
    </G>
  )
}
