import { vi } from 'vitest'

// Stub Nuxt auto-imports that aren't available in the vitest environment
vi.stubGlobal('useRuntimeConfig', () => ({
    public: { backendMode: 'standalone' },
}))

vi.stubGlobal('$fetch', vi.fn())
