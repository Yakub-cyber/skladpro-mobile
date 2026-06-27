const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// supabase/functions — это Deno Edge Functions (.ts), не часть RN-приложения.
// Исключаем, иначе Metro находит .ts и требует typescript.
config.resolver.blockList = [/supabase[\\/]functions[\\/].*/]

module.exports = withNativeWind(config, { input: './global.css' })
