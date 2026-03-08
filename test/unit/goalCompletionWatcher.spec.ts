import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { useDataStore } from '~/stores/data'
import { useGoalCompletionWatcher } from '~/composables/useGoalCompletionWatcher'
import type { Entry } from '~/types/Entry'
import type { Goal } from '~/types/Goal'

// Pin to Wednesday 2025-06-11T12:00:00Z
// Wednesday day index: (3 + 6) % 7 = 2 → bit 2 = 0b0000100 = 4
const PINNED_DATE = new Date('2025-06-11T12:00:00Z')
const PINNED_NOW = PINNED_DATE.getTime()
const ALL_DAYS = 127 // 0b1111111
const WEDNESDAY_ONLY = 4 // 0b0000100
const MONDAY_ONLY = 1 // 0b0000001

let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
})

const mockAddToast = vi.fn()
vi.stubGlobal('useToast', () => ({
  addToast: mockAddToast,
  toasts: ref([]),
  removeToast: vi.fn(),
}))

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
}))

const sampleActivity = { title: 'Work', icon: 'briefcase', emoji: '💼' }

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    count: 2,
    interval: 'day',
    unit: 'event',
    days: ALL_DAYS,
    reminder: false,
    ...overrides,
  }
}

let entryCounter = 0
function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry-${++entryCounter}`,
    start: PINNED_NOW - 3_600_000,
    end: PINNED_NOW,
    running: false,
    categoryId: 'cat-1',
    comment: '',
    ...overrides,
  }
}

describe('useGoalCompletionWatcher', () => {
  let scope: ReturnType<typeof effectScope>
  let store: ReturnType<typeof useDataStore>

  function setupCategory(goals: Goal[] = [makeGoal()], options: { hidden?: boolean } = {}) {
    store.addCategory({ title: 'Work', color: '#ff0000', activity: sampleActivity })
    const id = store.categories[0]!.id
    store.updateCategory({ id, goals })
    if (options.hidden) {
      store.updateCategory({ id, hidden: true })
    }
    return id
  }

  function initWatcher() {
    scope = effectScope()
    scope.run(() => useGoalCompletionWatcher((key: string) => key))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_DATE)
    setActivePinia(createPinia())
    uuidCounter = 0
    entryCounter = 0
    mockAddToast.mockClear()
    store = useDataStore()
  })

  afterEach(() => {
    scope?.stop()
    vi.useRealTimers()
  })

  describe('initial scan', () => {
    it('does not fire a toast for already-completed goals on init', async () => {
      const catId = setupCategory([makeGoal({ count: 1 })])
      store.addEntry(makeEntry({ categoryId: catId }))

      initWatcher()
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })
  })

  describe('event-based completion', () => {
    it('fires toast when entries change and goal becomes complete', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })

    it('does not fire toast when goal is not yet complete', async () => {
      const goal = makeGoal({ count: 3 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })

    it('deduplicates: does not re-notify same goal+period', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      // First entry completes the goal
      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      // Second entry — still complete, should not re-notify
      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })

    it('re-notifies after progress drops below then re-meets goal', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      // Complete the goal
      const entry = makeEntry({ categoryId: catId })
      store.addEntry(entry)
      await nextTick()
      expect(mockAddToast).toHaveBeenCalledTimes(1)

      // Remove entry — progress drops below
      store.deleteEntry(entry.id)
      await nextTick()

      // Re-complete
      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(2)
    })

    it('toast message includes emoji and title', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledWith(
        '💼 Work — goalReached',
        expect.any(Object),
      )
    })

    it('toast options include duration, categoryId, goals', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          duration: 5000,
          categoryId: catId,
          goals: [goal],
        }),
      )
    })
  })

  describe('day filtering', () => {
    it('skips goals not scheduled for the current day of week', async () => {
      const goal = makeGoal({ count: 1, days: MONDAY_ONLY })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })

    it('checks goals scheduled for the current day of week', async () => {
      const goal = makeGoal({ count: 1, days: WEDNESDAY_ONLY })
      const catId = setupCategory([goal])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })
  })

  describe('hidden categories', () => {
    it('skips goals on hidden categories', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal], { hidden: true })

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })
  })

  describe('multiple goals', () => {
    it('notifies each completed goal independently', async () => {
      const goalMet = makeGoal({ count: 1 })
      const goalNotMet = makeGoal({ count: 10 })
      const catId = setupCategory([goalMet, goalNotMet])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })

    it('notifies both when both completed', async () => {
      const goal1 = makeGoal({ count: 1 })
      const goal2 = makeGoal({ count: 2 })
      const catId = setupCategory([goal1, goal2])

      initWatcher()
      await nextTick()

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()
      expect(mockAddToast).toHaveBeenCalledTimes(1) // only goal1

      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()
      expect(mockAddToast).toHaveBeenCalledTimes(2) // now goal2 too
    })
  })

  describe('time-based polling', () => {
    it('starts a 1-second interval when a running entry exists', async () => {
      const goal = makeGoal({ count: 1, unit: 'hours' })
      const catId = setupCategory([goal])

      // Running entry started 59 minutes ago
      store.addEntry(makeEntry({
        categoryId: catId,
        start: PINNED_NOW - 59 * 60_000,
        end: null,
        running: true,
      }))

      initWatcher()
      await nextTick()
      await nextTick()

      // Advance 2 minutes to cross the 1-hour threshold
      vi.advanceTimersByTime(120_000)
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })

    it('clears interval when no running entries remain', async () => {
      const goal = makeGoal({ count: 100, unit: 'hours' }) // high threshold, won't trigger
      const catId = setupCategory([goal])

      const entry = makeEntry({
        categoryId: catId,
        start: PINNED_NOW - 60_000,
        end: null,
        running: true,
      })
      store.addEntry(entry)

      initWatcher()
      await nextTick()
      await nextTick()

      // Close the running entry
      store.closeEntry(entry.id)
      await nextTick()
      await nextTick()

      mockAddToast.mockClear()

      // Advance timers — should not trigger any scan since interval was cleared
      vi.advanceTimersByTime(5000)
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })
  })

  describe('server hydration', () => {
    it('does not fire toast for goals completed during initial server hydration', async () => {
      const goal = makeGoal({ count: 1 })

      // Simulate server mode: serverHydrated starts false
      store.serverHydrated = false
      initWatcher()
      await nextTick()

      // Simulate server hydration: add category + completed entry, then mark hydrated
      const catId = setupCategory([goal])
      store.addEntry(makeEntry({ categoryId: catId }))
      store.serverHydrated = true
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })

    it('fires toast for new entries after server hydration', async () => {
      const goal = makeGoal({ count: 1 })
      const catId = setupCategory([goal])

      // Simulate server mode: serverHydrated starts false
      store.serverHydrated = false
      initWatcher()
      await nextTick()

      // Simulate hydration completing (no completed goals yet)
      store.serverHydrated = true
      store.entries = [...store.entries]
      await nextTick()

      mockAddToast.mockClear()

      // Now a real user action completes the goal
      store.addEntry(makeEntry({ categoryId: catId }))
      await nextTick()

      expect(mockAddToast).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('clears polling interval on scope stop', async () => {
      const goal = makeGoal({ count: 100, unit: 'hours' })
      const catId = setupCategory([goal])

      store.addEntry(makeEntry({
        categoryId: catId,
        start: PINNED_NOW - 60_000,
        end: null,
        running: true,
      }))

      initWatcher()
      await nextTick()
      await nextTick()

      // Stop the scope (triggers onUnmounted)
      scope.stop()
      mockAddToast.mockClear()

      // Advance timers — interval should be cleared
      vi.advanceTimersByTime(5000)
      await nextTick()

      expect(mockAddToast).not.toHaveBeenCalled()
    })
  })
})
