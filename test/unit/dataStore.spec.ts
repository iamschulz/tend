import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '~/stores/data'
import type { Entry } from '~/types/Category'

// Stub crypto.randomUUID for deterministic IDs
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
})

const sampleActivity = { title: 'Work', icon: 'briefcase', emoji: '💼' }

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry-${++uuidCounter}`,
    start: Date.now(),
    end: null,
    running: true,
    categoryId: 'cat-1',
    ...overrides,
  }
}

describe('useDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    uuidCounter = 0
  })

  // --- addCategory ---
  describe('addCategory', () => {
    it('creates a category with a UUID', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })

      expect(store.categories).toHaveLength(1)
      expect(store.categories[0]!.id).toBe('uuid-1')
      expect(store.categories[0]!.title).toBe('Work')
    })

    it('sets hidden to false by default', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })

      expect(store.categories[0]!.hidden).toBe(false)
    })
  })

  // --- updateCategory ---
  describe('updateCategory', () => {
    it('updates title, activity, and color', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })
      const id = store.categories[0]!.id

      const newActivity = { title: 'Play', icon: 'gamepad', emoji: '🎮' }
      store.updateCategory({ id, title: 'Play', activity: newActivity, color: '#00ff00' })

      expect(store.categories[0]!.title).toBe('Play')
      expect(store.categories[0]!.activity).toEqual(newActivity)
      expect(store.categories[0]!.color).toBe('#00ff00')
    })

    it('can toggle hidden', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })
      const id = store.categories[0]!.id

      store.updateCategory({ id, hidden: true })
      expect(store.categories[0]!.hidden).toBe(true)

      store.updateCategory({ id, hidden: false })
      expect(store.categories[0]!.hidden).toBe(false)
    })

    it('no-ops when id is missing', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })
      store.updateCategory({ title: 'Changed' })
      expect(store.categories[0]!.title).toBe('Work')
    })

    it('no-ops when id is not found', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })
      store.updateCategory({ id: 'nonexistent', title: 'Changed' })
      expect(store.categories[0]!.title).toBe('Work')
    })
  })

  // --- deleteCategory ---
  describe('deleteCategory', () => {
    it('removes the correct category and its entries', () => {
      const store = useDataStore()
      store.addCategory({ title: 'A', color: '#f00', activity: sampleActivity })
      store.addCategory({ title: 'B', color: '#0f0', activity: sampleActivity })
      const idA = store.categories[0]!.id

      store.addEntry(makeEntry({ categoryId: idA }))
      store.deleteCategory(idA)

      expect(store.categories).toHaveLength(1)
      expect(store.categories[0]!.title).toBe('B')
      expect(store.entries).toHaveLength(0)
    })
  })

  // --- addEntry / deleteEntry ---
  describe('addEntry', () => {
    it('adds entry to the flat entries array', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      const entry = makeEntry({ categoryId: catId })
      store.addEntry(entry)

      expect(store.entries).toHaveLength(1)
      expect(store.entries[0]!.id).toBe(entry.id)
    })
  })

  describe('deleteEntry', () => {
    it('removes the entry from the flat array', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      const entry = makeEntry({ categoryId: catId })
      store.addEntry(entry)
      store.deleteEntry(entry.id)

      expect(store.entries).toHaveLength(0)
    })
  })

  // --- getAllEntries ---
  describe('getAllEntries', () => {
    it('flattens and sorts entries by start descending', () => {
      const store = useDataStore()
      store.addCategory({ title: 'A', color: '#f00', activity: sampleActivity })
      store.addCategory({ title: 'B', color: '#0f0', activity: sampleActivity })
      const catA = store.categories[0]!.id
      const catB = store.categories[1]!.id

      store.addEntry(makeEntry({ categoryId: catA, start: 1000 }))
      store.addEntry(makeEntry({ categoryId: catB, start: 3000 }))
      store.addEntry(makeEntry({ categoryId: catA, start: 2000 }))

      const all = store.getAllEntries
      expect(all).toHaveLength(3)
      expect(all[0]!.start).toBe(3000)
      expect(all[1]!.start).toBe(2000)
      expect(all[2]!.start).toBe(1000)
    })

    it('excludes entries from hidden categories', () => {
      const store = useDataStore()
      store.addCategory({ title: 'A', color: '#f00', activity: sampleActivity })
      store.addCategory({ title: 'B', color: '#0f0', activity: sampleActivity })
      const catA = store.categories[0]!.id
      const catB = store.categories[1]!.id

      store.addEntry(makeEntry({ categoryId: catA, start: 1000 }))
      store.addEntry(makeEntry({ categoryId: catB, start: 2000 }))

      store.updateCategory({ id: catA, hidden: true })

      const all = store.getAllEntries
      expect(all).toHaveLength(1)
      expect(all[0]!.category!.title).toBe('B')
    })
  })

  // --- hasNoEntries ---
  describe('hasNoEntries', () => {
    it('returns true when no entries exist', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      expect(store.hasNoEntries).toBe(true)
    })

    it('returns false when entries exist', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      store.addEntry(makeEntry({ categoryId: store.categories[0]!.id }))
      expect(store.hasNoEntries).toBe(false)
    })
  })

  // --- getEntriesForRange ---
  describe('getEntriesForRange', () => {
    it('includes entry fully inside range', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({
        categoryId: catId,
        start: 5000,
        end: 8000,
        running: false,
      }))

      const results = store.getEntriesForRange(new Date(0), new Date(10000))
      expect(results).toHaveLength(1)
    })

    it('includes partially overlapping entry (starts before range)', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({
        categoryId: catId,
        start: 1000,
        end: 6000,
        running: false,
      }))

      const results = store.getEntriesForRange(new Date(5000), new Date(10000))
      expect(results).toHaveLength(1)
    })

    it('includes running entry (no end) that overlaps range', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({
        categoryId: catId,
        start: 1000,
        end: null,
        running: true,
      }))

      const results = store.getEntriesForRange(new Date(5000), new Date(10000))
      expect(results).toHaveLength(1)
    })

    it('excludes entry outside range', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({
        categoryId: catId,
        start: 1000,
        end: 2000,
        running: false,
      }))

      const results = store.getEntriesForRange(new Date(5000), new Date(10000))
      expect(results).toHaveLength(0)
    })

    it('excludes entries from hidden categories', () => {
      const store = useDataStore()
      store.addCategory({ title: 'A', color: '#f00', activity: sampleActivity })
      store.addCategory({ title: 'B', color: '#0f0', activity: sampleActivity })
      const catA = store.categories[0]!.id
      const catB = store.categories[1]!.id

      store.addEntry(makeEntry({ categoryId: catA, start: 5000, end: 8000, running: false }))
      store.addEntry(makeEntry({ categoryId: catB, start: 5000, end: 8000, running: false }))

      store.updateCategory({ id: catA, hidden: true })

      const results = store.getEntriesForRange(new Date(0), new Date(10000))
      expect(results).toHaveLength(1)
      expect(results[0]!.category!.title).toBe('B')
    })
  })

  // --- hasRunningEntries ---
  describe('hasRunningEntries', () => {
    it('detects running entries', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({ categoryId: catId, running: true }))
      expect(store.hasRunningEntries(store.categories[0]!)).toBe(true)
    })

    it('returns false when no entries are running', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({ categoryId: catId, running: false, end: Date.now() }))
      expect(store.hasRunningEntries(store.categories[0]!)).toBe(false)
    })
  })

  // --- closeEntry ---
  describe('closeEntry', () => {
    it('sets end and running=false', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      const entry = makeEntry({ categoryId: catId, running: true, end: null })
      store.addEntry(entry)
      store.closeEntry(entry.id)

      const closed = store.entries[0]!
      expect(closed.running).toBe(false)
      expect(closed.end).toBeTypeOf('number')
    })
  })

  // --- importData ---
  describe('importData', () => {
    it('replaces all categories and entries from legacy format', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Old', color: '#f00', activity: sampleActivity })

      const imported = [
        {
          id: 'imp-1',
          title: 'Imported',
          activity: sampleActivity,
          color: '#0f0',
          hidden: false,
          entries: [makeEntry({ categoryId: 'imp-1' })],
        },
      ]

      store.importData(imported)

      expect(store.categories).toHaveLength(1)
      expect(store.categories[0]!.title).toBe('Imported')
      expect(store.categories[0]!.id).toBe('imp-1')
      expect(store.entries).toHaveLength(1)
    })
  })

  // --- closeAllEntries ---
  describe('closeAllEntries', () => {
    it('closes all running entries in a category', () => {
      const store = useDataStore()
      store.addCategory({ title: 'Work', color: '#f00', activity: sampleActivity })
      const catId = store.categories[0]!.id

      store.addEntry(makeEntry({ categoryId: catId, running: true, end: null }))
      store.addEntry(makeEntry({ categoryId: catId, running: true, end: null }))
      store.closeAllEntries(catId)

      for (const entry of store.entries) {
        expect(entry.running).toBe(false)
        expect(entry.end).toBeTypeOf('number')
      }
    })
  })
})
