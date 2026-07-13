// In-memory mock AsyncStorage для юнит-тестов.
const map = new Map()
module.exports = {
  default: {
    getItem: async (k) => (map.has(k) ? map.get(k) : null),
    setItem: async (k, v) => { map.set(k, v) },
    removeItem: async (k) => { map.delete(k) },
    clear: async () => { map.clear() },
  },
}
