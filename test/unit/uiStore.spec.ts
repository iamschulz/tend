import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '~/stores/ui'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // --- toggleMenu ---
  describe('toggleMenu', () => {
    it('toggles menuOpen', () => {
      const store = useUiStore()
      expect(store.menuOpen).toBe(false)
      store.toggleMenu()
      expect(store.menuOpen).toBe(true)
      store.toggleMenu()
      expect(store.menuOpen).toBe(false)
    })

    it('forces true', () => {
      const store = useUiStore()
      store.toggleMenu(true)
      expect(store.menuOpen).toBe(true)
      store.toggleMenu(true)
      expect(store.menuOpen).toBe(true)
    })

    it('forces false', () => {
      const store = useUiStore()
      store.toggleMenu(true)
      store.toggleMenu(false)
      expect(store.menuOpen).toBe(false)
    })
  })

  // --- requestConfirm + resolveConfirm ---
  describe('requestConfirm / resolveConfirm', () => {
    it('resolves with true when confirmed', async () => {
      const store = useUiStore()
      const promise = store.requestConfirm('Delete?')

      expect(store.confirmOpen).toBe(true)
      expect(store.confirmMessage).toBe('Delete?')

      store.resolveConfirm(true)
      await expect(promise).resolves.toBe(true)
      expect(store.confirmOpen).toBe(false)
    })

    it('resolves with false when denied', async () => {
      const store = useUiStore()
      const promise = store.requestConfirm('Delete?')

      store.resolveConfirm(false)
      await expect(promise).resolves.toBe(false)
    })
  })

  // --- toggleConfirm(false) auto-resolves ---
  describe('toggleConfirm', () => {
    it('auto-resolves with false when closed', async () => {
      const store = useUiStore()
      const promise = store.requestConfirm('Delete?')

      store.toggleConfirm(false)
      await expect(promise).resolves.toBe(false)
      expect(store.confirmOpen).toBe(false)
    })
  })
})
