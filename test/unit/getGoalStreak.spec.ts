import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getGoalStreak } from '~/util/getGoalStreak'
import type { Goal } from '~/types/Goal'
import type { Entry } from '~/types/Entry'

// Pin to Wednesday 2025-06-11 12:00 local time.
const PINNED_DATE = new Date(2025, 5, 11, 12, 0, 0)
const PINNED_NOW = PINNED_DATE.getTime()

// Weekday bitmask helpers (bit 0 = Monday, matching the app).
const ALL_DAYS = 127
const MON_WED_FRI = (1 << 0) | (1 << 2) | (1 << 4)

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    count: 1,
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
    start: PINNED_NOW,
    end: PINNED_NOW,
    running: false,
    categoryId: 'cat-1',
    comment: '',
    ...overrides,
  }
}

/**
 * Builds a completed event entry inside the local day `daysAgo` days before the pinned date.
 * @param daysAgo - How many days before the pinned date the entry falls on
 */
function dayEntry(daysAgo: number, overrides: Partial<Entry> = {}): Entry {
  const d = new Date(2025, 5, 11, 10, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  const start = d.getTime()
  return makeEntry({ start, end: start + 3_600_000, ...overrides })
}

describe('getGoalStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(PINNED_DATE)
    entryCounter = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns zero streaks when there are no entries', () => {
    expect(getGoalStreak(makeGoal(), [], 'cat-1', PINNED_NOW)).toEqual({ current: 0, best: 0 })
  })

  it('ignores entries from other categories', () => {
    const entries = [dayEntry(0, { categoryId: 'cat-2' }), dayEntry(1, { categoryId: 'cat-2' })]
    expect(getGoalStreak(makeGoal(), entries, 'cat-1', PINNED_NOW)).toEqual({ current: 0, best: 0 })
  })

  it('counts consecutive met days ending today', () => {
    const entries = [dayEntry(0), dayEntry(1), dayEntry(2)]
    expect(getGoalStreak(makeGoal(), entries, 'cat-1', PINNED_NOW)).toEqual({ current: 3, best: 3 })
  })

  it('does not break the current streak while today is only in progress', () => {
    // Met yesterday and the day before, nothing yet today.
    const entries = [dayEntry(1), dayEntry(2)]
    expect(getGoalStreak(makeGoal(), entries, 'cat-1', PINNED_NOW)).toEqual({ current: 2, best: 2 })
  })

  it('breaks the current streak on a missed past day but keeps the best run', () => {
    // Best run of 3 (days 3–5 ago), then a gap at day 2, then 1 recent (yesterday).
    const entries = [dayEntry(1), dayEntry(3), dayEntry(4), dayEntry(5)]
    expect(getGoalStreak(makeGoal(), entries, 'cat-1', PINNED_NOW)).toEqual({ current: 1, best: 3 })
  })

  it('skips non-applicable weekdays without breaking the streak', () => {
    // Mon/Wed/Fri goal. Today is Wed (11th). Applicable days back: Wed 11, Mon 9, Fri 6.
    const goal = makeGoal({ days: MON_WED_FRI })
    const entries = [dayEntry(0), dayEntry(2), dayEntry(5)]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 3, best: 3 })
  })

  it('treats a partially met duration goal as a miss', () => {
    // Goal: 60 minutes/day. Yesterday full (60m), today only 20m → today in progress (skipped),
    // day before yesterday 0 → streak is just yesterday.
    const goal = makeGoal({ unit: 'minutes', count: 60 })
    const yesterdayStart = new Date(2025, 5, 10, 10, 0, 0).getTime()
    const todayStart = new Date(2025, 5, 11, 8, 0, 0).getTime()
    const entries = [
      makeEntry({ start: yesterdayStart, end: yesterdayStart + 60 * 60_000 }),
      makeEntry({ start: todayStart, end: todayStart + 20 * 60_000 }),
    ]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 1, best: 1 })
  })

  it('breaks a duration streak when a completed past period falls short', () => {
    const goal = makeGoal({ unit: 'minutes', count: 60 })
    const dayAt = (daysAgo: number, minutes: number) => {
      const d = new Date(2025, 5, 11, 10, 0, 0)
      d.setDate(d.getDate() - daysAgo)
      return makeEntry({ start: d.getTime(), end: d.getTime() + minutes * 60_000 })
    }
    // today 60m, yesterday 30m (short → miss), 2 days ago 60m
    const entries = [dayAt(0, 60), dayAt(1, 30), dayAt(2, 60)]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 1, best: 1 })
  })

  it('ignores a running timer when deciding whether a duration goal is met', () => {
    // Goal: 60 minutes/day. Yesterday full (60m), today a timer running for 90m.
    // The running entry must not count, so today stays merely in progress.
    const goal = makeGoal({ unit: 'minutes', count: 60 })
    const yesterdayStart = new Date(2025, 5, 10, 10, 0, 0).getTime()
    const entries = [
      makeEntry({ start: yesterdayStart, end: yesterdayStart + 60 * 60_000 }),
      makeEntry({ start: PINNED_NOW - 90 * 60_000, end: null, running: true }),
    ]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 1, best: 1 })
  })

  it('returns zero streaks when the only entry is still running', () => {
    const goal = makeGoal({ unit: 'minutes', count: 60 })
    const entries = [makeEntry({ start: PINNED_NOW - 90 * 60_000, end: null, running: true })]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 0, best: 0 })
  })

  it('counts consecutive met weeks for a week-interval goal', () => {
    // One event each in this week, last week, and two weeks ago.
    const goal = makeGoal({ interval: 'week' })
    const entries = [dayEntry(0), dayEntry(7), dayEntry(14)]
    expect(getGoalStreak(goal, entries, 'cat-1', PINNED_NOW)).toEqual({ current: 3, best: 3 })
  })

  it('guarantees best is at least the current streak', () => {
    const entries = [dayEntry(0), dayEntry(1), dayEntry(2), dayEntry(3)]
    const { current, best } = getGoalStreak(makeGoal(), entries, 'cat-1', PINNED_NOW)
    expect(best).toBeGreaterThanOrEqual(current)
    expect(current).toBe(4)
  })
})
