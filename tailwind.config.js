/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Палитра СкладПро (тёмная), синхронно с веб-версией
        bg: '#0B0F1A',
        surface: '#121826',
        'surface-2': '#1A2233',
        'surface-3': '#232E44',
        line: '#2A3650',
        ink: '#E7ECF5',
        muted: '#8A97B0',
        brand: '#6366F1',
        'brand-ink': '#FFFFFF',
        'brand-soft': '#1E2547',
        ok: '#22C55E',
        'ok-soft': '#11261C',
        bad: '#EF4444',
        'bad-soft': '#2A1518',
        warn: '#F59E0B',
        info: '#38BDF8',
      },
    },
  },
  plugins: [],
}
