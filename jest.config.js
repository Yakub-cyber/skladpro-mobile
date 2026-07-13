// Минимальный jest-конфиг: тестируем только чистую JS-логику (lib/outbox и т.п.),
// без RN-специфичных импортов. Для тестов, которым нужен нативный AsyncStorage,
// подкидываем ../__mocks__/AsyncStorage.js. Тесты RN-компонентов пока не пишем —
// это отдельная задача (react-native-testing-library).
//
// babel.config.js проекта содержит nativewind/babel (нужен для JSX className),
// но nativewind несовместим с node-тестами. Поэтому подключаем чистый
// @babel/preset-env через babel.config.test.js, минуя основной babel.config.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.js', '<rootDir>/lib/**/*.test.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/AsyncStorage.js',
  },
}
