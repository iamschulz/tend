import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getGoalProgress, getGoalPeriodKey } from '~/util/getGoalProgress'
import type { Goal } from '~/types/Goal'
import type { Entry } from '~/types/Entry'

// Pin to Wednesday 2025-06-11T12:00:00Z
// Day range:   2025-06-11 00:00:00 – 23:59:59.999 UTC
// Week range:  2025-06-09 (Mon) – 2025-06-15 (Sun) UTC
// Month range: 2025-06-01 – 2025-06-30 UTC
const PINNED_DATE = new Date('2025-06-11T12:00:00Z')
const PINNED_NOW = PINNED_DATE.getTime()

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    count: 3,
    interval: 'day',
    unit: 'event',
    days: 127,
    reminder: false,
    ...overrides,
  }
}

let entryCounter = 0
function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `entry-${++entryCounter}`,
    start: PINNED_NOW - 3_600_000, // 1 hour before pinned time
    end: PINNED_NOW,
    running: false,
    categoryId: 'cat-1',
    comment: '',
    ...overrides,
  }
}

describe('getGoalProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_DATE)
    entryCounter = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('event counting (unit: "event")', () => {
    it('returns 0 when no entries exist', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      expect(getGoalProgress(goal, [], 'cat-1', PINNED_NOW)).toBe(0)
    })

    it('counts entries matching the category within the day range', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      const entries = [
        makeEntry({ start: PINNED_NOW - 7200_000, end: PINNED_NOW - 3600_000 }),
        makeEntry({ start: PINNED_NOW - 1800_000, end: PINNED_NOW }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(2)
    })

    it('ignores entries from a different category', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      const entries = [
        makeEntry({ categoryId: 'cat-1' }),
        makeEntry({ categoryId: 'cat-2' }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(1)
    })

    it('ignores entries outside the day range', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      // Entry from yesterday (entirely before today's range)
      const yesterday = Date.UTC(2025, 5, 10, 10, 0, 0)
      const entries = [
        makeEntry({ start: yesterday, end: yesterday + 3_600_000 }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(0)
    })

    it('counts entries that partially overlap the range', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      // Entry starts yesterday, ends today
      const entries = [
        makeEntry({
          start: Date.UTC(2025, 5, 10, 22, 0, 0),
          end: Date.UTC(2025, 5, 11, 2, 0, 0),
        }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(1)
    })

    it('counts running entries (end: null) within range', () => {
      const goal = makeGoal({ unit: 'event', interval: 'day' })
      const entries = [
        makeEntry({ start: PINNED_NOW - 1800_000, end: null, running: true }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(1)
    })

    it('counts with week interval — includes entries across the whole week', () => {
      const goal = makeGoal({ unit: 'event', interval: 'week' })
      const entries = [
        // Monday entry
        makeEntry({ start: Date.UTC(2025, 5, 9, 10, 0, 0), end: Date.UTC(2025, 5, 9, 11, 0, 0) }),
        // Wednesday entry (today)
        makeEntry({ start: PINNED_NOW - 3600_000, end: PINNED_NOW }),
        // Sunday entry
        makeEntry({ start: Date.UTC(2025, 5, 15, 10, 0, 0), end: Date.UTC(2025, 5, 15, 11, 0, 0) }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(3)
    })

    it('counts with month interval — includes entries across the whole month', () => {
      const goal = makeGoal({ unit: 'event', interval: 'month' })
      const entries = [
        // June 1st
        makeEntry({ start: Date.UTC(2025, 5, 1, 10, 0, 0), end: Date.UTC(2025, 5, 1, 11, 0, 0) }),
        // June 30th
        makeEntry({ start: Date.UTC(2025, 5, 30, 10, 0, 0), end: Date.UTC(2025, 5, 30, 11, 0, 0) }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(2)
    })
  })

  describe('duration-based progress', () => {
    it('returns total minutes for completed entries (unit: "minutes")', () => {
      const goal = makeGoal({ unit: 'minutes', interval: 'day' })
      // 30-minute entry
      const entries = [
        makeEntry({ start: PINNED_NOW - 30 * 60_000, end: PINNED_NOW }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(30)
    })

    it('uses now parameter for running entries duration', () => {
      const goal = makeGoal({ unit: 'minutes', interval: 'day' })
      // Running entry started 45 minutes ago
      const entries = [
        makeEntry({ start: PINNED_NOW - 45 * 60_000, end: null, running: true }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(45)
    })

    it('sums multiple entries correctly', () => {
      const goal = makeGoal({ unit: 'minutes', interval: 'day' })
      const entries = [
        makeEntry({ start: PINNED_NOW - 20 * 60_000, end: PINNED_NOW - 10 * 60_000 }),
        makeEntry({ start: PINNED_NOW - 5 * 60_000, end: PINNED_NOW }),
      ]
      // 10 + 5 = 15 minutes
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(15)
    })

    it('converts to hours correctly (unit: "hours")', () => {
      const goal = makeGoal({ unit: 'hours', interval: 'day' })
      // 90-minute entry = 1.5 hours
      const entries = [
        makeEntry({ start: PINNED_NOW - 90 * 60_000, end: PINNED_NOW }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(1.5)
    })

    it('converts to days correctly (unit: "days")', () => {
      const goal = makeGoal({ unit: 'days', interval: 'month' })
      // 12-hour entry = 0.5 days
      const entries = [
        makeEntry({ start: PINNED_NOW - 12 * 3_600_000, end: PINNED_NOW }),
      ]
      expect(getGoalProgress(goal, entries, 'cat-1', PINNED_NOW)).toBe(0.5)
    })
  })
})

describe('getGoalPeriodKey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "day:<timestamp>" for day interval', () => {
    const key = getGoalPeriodKey('day')
    const dayStart = Date.UTC(2025, 5, 11)
    expect(key).toBe(`day:${dayStart}`)
  })

  it('returns "week:<timestamp>" for week interval', () => {
    const key = getGoalPeriodKey('week')
    const weekStart = Date.UTC(2025, 5, 9) // Monday
    expect(key).toBe(`week:${weekStart}`)
  })

  it('returns "month:<timestamp>" for month interval', () => {
    const key = getGoalPeriodKey('month')
    const monthStart = Date.UTC(2025, 5, 1)
    expect(key).toBe(`month:${monthStart}`)
  })

  it('returns different keys for different days (day interval)', () => {
    const key1 = getGoalPeriodKey('day')
    vi.setSystemTime(new Date('2025-06-12T12:00:00Z'))
    const key2 = getGoalPeriodKey('day')
    expect(key1).not.toBe(key2)
  })

  it('returns the same key for different days in the same week (week interval)', () => {
    const key1 = getGoalPeriodKey('week')
    vi.setSystemTime(new Date('2025-06-12T12:00:00Z')) // Thursday, same week
    const key2 = getGoalPeriodKey('week')
    expect(key1).toBe(key2)
  })
})
