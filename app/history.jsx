import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { router } from 'expo-router'
import {
  ChevronLeft, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, ChevronRight,
  ArrowLeftRight, Truck, ShoppingCart, Undo2, FileText, Check, Ban, Trash2, Printer,
} from 'lucide-react-native'
import { useStore } from '../store/useStore'
import { Screen, Card, Badge, Btn, Empty, C, tone } from '../components/ui'
import { money, num, dateTime } from '../lib/format'
import { statusInfo, docTypeInfo, DOC_STATUS } from '../lib/constants'
import { printDocument } from '../lib/print'

const MV = {
  in: { label: 'Закупка', color: C.ok, icon: ArrowDownToLine },
  writeoff: { label: 'Списание', color: C.bad, icon: ArrowUpFromLine },
  return: { label: 'Возврат продажи', color: C.info, icon: ArrowDownToLine },
  supplier_return: { label: 'Возврат поставщику', color: C.warn, icon: Truck },
  transfer: { label: 'Перемещение', color: C.info, icon: ArrowLeftRight },
  inventory: { label: 'Инвентаризация', color: C.warn, icon: ClipboardCheck },
}

const DOC_ICON = {
  purchase: ArrowDownToLine,
  sale: ShoppingCart,
  sale_return: Undo2,
  supplier_return: Truck,
  transfer: ArrowLeftRight,
  writeoff: ArrowUpFromLine,
  inventory: ClipboardCheck,
}

export default function History() {
  const orders = useStore((s) => s.orders)
  const movements = useStore((s) => s.movements) || []
  const documents = useStore((s) => s.documents) || []
  const employees = useStore((s) => s.employees) || []
  const postDocument = useStore((s) => s.postDocument)
  const cancelDocument = useStore((s) => s.cancelDocument)
  const removeDocument = useStore((s) => s.removeDocument)
  const [tab, setTab] = useState('docs')
  const nameOf = (id) => employees.find((e) => e.id === id)?.name || 'Система'

  const sales = [...orders].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))

  const confirmCancel = (d) =>
    Alert.alert('Отменить проводку?', `${d.no} · остатки вернутся к прежним значениям`, [
      { text: 'Нет' },
      { text: 'Отменить документ', style: 'destructive', onPress: () => cancelDocument(d.id) },
    ])
  const print = (d) =>
    printDocument(d, nameOf(d.by)).catch((e) =>
      Alert.alert('Печать недоступна', e?.message || 'Не удалось открыть печать'),
    )

  return (
    <Screen>
      <View className="flex-row items-center px-3 h-12 border-b border-line">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <ChevronLeft size={24} color={C.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-semibold ml-1">История и документы</Text>
      </View>

      {/* Вкладки */}
      <View className="flex-row bg-surface-2 rounded-xl p-1 mx-4 my-3">
        {[['docs', 'Документы'], ['sales', 'Продажи'], ['stock', 'Склад']].map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} className={`flex-1 h-9 rounded-lg items-center justify-center ${tab === k ? 'bg-brand' : ''}`}>
            <Text className={`text-[13px] font-semibold ${tab === k ? 'text-brand-ink' : 'text-muted'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {tab === 'docs' ? (
          documents.length === 0 ? (
            <Empty title="Документов нет" text="Создайте документ через «+» — он появится в реестре" icon={FileText} />
          ) : (
            documents.map((d) => {
              const ti = docTypeInfo(d.type)
              const st = DOC_STATUS[d.status] || DOC_STATUS.posted
              const Icon = DOC_ICON[d.type] || FileText
              const muted = d.status === 'cancelled'
              return (
                <Card key={d.id} className="p-3.5 mb-2">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: (muted ? C.muted : C.brand) + '22' }}>
                      <Icon size={18} color={muted ? C.muted : C.brand} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{d.no} · {ti.label}</Text>
                      <Text className="text-muted text-[12px] mt-0.5">{dateTime(d.createdAt)} · {nameOf(d.by)} · {(d.items || []).length} поз. · {num(d.totalQty)} ед.</Text>
                    </View>
                    <Badge color={tone(st.color)}>{st.label}</Badge>
                  </View>
                  <View className="flex-row gap-2 mt-3">
                    {d.status === 'draft' && (
                      <Btn title="Провести" icon={Check} size="sm" className="flex-1" onPress={() => postDocument(d.id)} />
                    )}
                    {d.status === 'posted' && (
                      <Btn title="Отменить" variant="soft" icon={Ban} size="sm" className="flex-1" onPress={() => confirmCancel(d)} />
                    )}
                    {d.status !== 'posted' && (
                      <Btn title="Удалить" variant="soft" icon={Trash2} size="sm" className="flex-1" onPress={() => removeDocument(d.id)} />
                    )}
                    <Btn title="Печать" variant="soft" icon={Printer} size="sm" className="flex-1" onPress={() => print(d)} />
                  </View>
                </Card>
              )
            })
          )
        ) : tab === 'sales' ? (
          sales.length === 0 ? <Empty title="Продаж нет" /> : sales.map((o) => {
            const si = statusInfo(o.status)
            return (
              <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} className="active:opacity-90">
                <Card className="p-3.5 mb-2 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{o.customerName}</Text>
                    <Text className="text-muted text-[12px] mt-0.5">{o.no} · {dateTime(o.createdAt)}</Text>
                  </View>
                  <View className="items-end mr-1.5">
                    <Text className="text-ink font-semibold">{money(o.total)}</Text>
                    <Badge color={tone(si.color)}>{si.label}</Badge>
                  </View>
                  <ChevronRight size={16} color={C.muted} />
                </Card>
              </Pressable>
            )
          })
        ) : (
          movements.length === 0 ? <Empty title="Операций нет" /> : movements.map((m) => {
            const info = MV[m.type] || MV.inventory
            return (
              <Card key={m.id} className="p-3.5 mb-2 flex-row items-center">
                <View className="h-10 w-10 rounded-xl items-center justify-center" style={{ backgroundColor: info.color + '22' }}>
                  <info.icon size={18} color={info.color} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-ink text-[14px] font-medium" numberOfLines={1}>{m.name}</Text>
                  <Text className="text-muted text-[12px] mt-0.5">{info.label} · {dateTime(m.at)}</Text>
                </View>
                <Text className="font-semibold" style={{ color: (m.delta || 0) === 0 ? C.muted : (m.delta || 0) > 0 ? C.ok : C.bad }}>
                  {(m.delta || 0) === 0 ? '↔' : `${(m.delta || 0) > 0 ? '+' : ''}${num(m.delta || 0)}`}
                </Text>
              </Card>
            )
          })
        )}
      </ScrollView>
    </Screen>
  )
}
