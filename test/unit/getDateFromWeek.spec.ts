import { describe, it, expect } from 'vitest'
import { getDateFromWeek } from '~/util/getDateFromWeek'
import { getIsoWeekString } from '~/util/getIsoWeekString'

describe('getDateFromWeek', () => {
  it('returns the Monday of a standard week', () => {
    const date = getDateFromWeek('2025-W24')
    expect(date.toISOString().slice(0, 10)).toBe('2025-06-09')
    // Verify it's a Monday (1)
    expect(date.getUTCDay()).toBe(1)
  })

  it('returns the Monday of week 1', () => {
    const date = getDateFromWeek('2025-W01')
    expect(date.toISOString().slice(0, 10)).toBe('2024-12-30')
    expect(date.getUTCDay()).toBe(1)
  })

  it('returns the Monday of the last week of a year', () => {
    const date = getDateFromWeek('2025-W52')
    expect(date.toISOString().slice(0, 10)).toBe('2025-12-22')
    expect(date.getUTCDay()).toBe(1)
  })

  it('roundtrips with getIsoWeekString', () => {
    const weeks = ['2025-W01', '2025-W24', '2025-W52', '2020-W53', '2026-W01']
    for (const week of weeks) {
      const monday = getDateFromWeek(week)
      expect(getIsoWeekString(monday)).toBe(week)
    }
  })
})
