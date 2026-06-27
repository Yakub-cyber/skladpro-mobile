import { useEffect, useState } from 'react'
import { View, Text, Pressable, Modal, Platform } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { X } from 'lucide-react-native'
import { C, Btn } from './ui'

// Полноэкранный сканер штрихкодов. onScan(code) вызывается один раз на код.
export default function Scanner({ visible, onScan, onClose }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    if (visible) setScanned(false)
  }, [visible])

  const handle = (result) => {
    if (scanned) return
    setScanned(true)
    onScan?.(result.data)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View className="flex-1 bg-black">
        {/* Шапка */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-3 bg-black">
          <Text className="text-white text-lg font-semibold">Сканировать штрихкод</Text>
          <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center">
            <X size={24} color="#fff" />
          </Pressable>
        </View>

        {!permission ? (
          <View className="flex-1 items-center justify-center" />
        ) : !permission.granted ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-white text-center mb-4">Нужен доступ к камере для сканирования</Text>
            <Btn title="Разрешить камеру" onPress={requestPermission} />
          </View>
        ) : (
          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
              }}
              onBarcodeScanned={scanned ? undefined : handle}
            />
            {/* Рамка прицела */}
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <View className="w-64 h-40 border-2 border-brand rounded-2xl" />
              <Text className="text-white/80 text-[13px] mt-4">Наведите на штрихкод товара</Text>
            </View>
            {scanned && (
              <View className="absolute bottom-10 left-0 right-0 items-center">
                <Btn title="Сканировать ещё" variant="soft" onPress={() => setScanned(false)} />
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  )
}
