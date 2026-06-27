import { useState } from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg'
import { C } from './ui'
import { money } from '../lib/format'

// Area-график выручки (как на сайте, recharts AreaChart) — нативно на SVG
export function AreaChart({ series = [], height = 200, color = C.brand }) {
  const [w, setW] = useState(0)
  const pad = { l: 6, r: 6, t: 10, b: 22 }
  const cw = Math.max(0, w - pad.l - pad.r)
  const ch = height - pad.t - pad.b
  const max = Math.max(1, ...series.map((s) => s.v))
  const n = series.length
  const X = (i) => pad.l + (n <= 1 ? cw / 2 : (i / (n - 1)) * cw)
  const Y = (v) => pad.t + ch - (v / max) * ch

  const line = series.map((s, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(s.v).toFixed(1)}`).join(' ')
  const area = n ? `${line} L${X(n - 1).toFixed(1)},${(pad.t + ch).toFixed(1)} L${X(0).toFixed(1)},${(pad.t + ch).toFixed(1)} Z` : ''
  const ticks = n ? [0, Math.floor(n / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i) : []
  const grid = [0, 0.5, 1]

  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.4} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((f) => (
              <Line key={f} x1={pad.l} y1={pad.t + ch * f} x2={w - pad.r} y2={pad.t + ch * f} stroke={C.line} strokeWidth={1} strokeDasharray="3 4" />
            ))}
            {area ? <Path d={area} fill="url(#revGrad)" /> : null}
            {line ? <Path d={line} stroke={color} strokeWidth={2.5} fill="none" /> : null}
          </Svg>
        )}
        {/* подпись максимума */}
        {w > 0 && (
          <Text className="text-muted text-[10px] absolute" style={{ top: 2, left: 4 }}>{money(max)}</Text>
        )}
      </View>
      <View className="flex-row justify-between px-1">
        {ticks.map((i) => (
          <Text key={i} className="text-muted text-[11px]">{series[i]?.label}</Text>
        ))}
      </View>
    </View>
  )
}
