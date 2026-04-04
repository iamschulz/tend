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
    include: ['test/e2e/login.spec.ts', 'test/e2e/logout.spec.ts', 'test/e2e/body-limit.spec.ts', 'test/e2e/server-api.spec.ts', 'test/e2e/multi-user.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
