import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '~~': resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['test/**/*.spec.ts'],
    exclude: ['test/e2e/**'],
    setupFiles: ['test/setup.ts'],
  },
})
