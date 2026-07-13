// Отдельный babel-конфиг для jest — без nativewind/expo-preset,
// которые тянут RN-специфичный runtime. Только преобразование ESM → CJS
// для node-совместимости.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
}
