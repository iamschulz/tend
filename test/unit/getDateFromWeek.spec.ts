import { describe, it, expect } from 'vitest'
import { getDateFromWeek } from '~/util/getDateFromWeek'
import { getIsoWeekString } from '~/util/getIsoWeekString'

describe('getDateFromWeek', () => {
  it('returns the Monday of a standard week', () => {
    const date = getDateFromWeek('2025-W24')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(5) // June
    expect(date.getDate()).toBe(9)
    expect(date.getDay()).toBe(1) // Monday
  })

  it('returns the Monday of week 1', () => {
    const date = getDateFromWeek('2025-W01')
    expect(date.getFullYear()).toBe(2024)
    expect(date.getMonth()).toBe(11) // December
    expect(date.getDate()).toBe(30)
    expect(date.getDay()).toBe(1)
  })

  it('returns the Monday of the last week of a year', () => {
    const date = getDateFromWeek('2025-W52')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(11) // December
    expect(date.getDate()).toBe(22)
    expect(date.getDay()).toBe(1)
  })

  it('roundtrips with getIsoWeekString', () => {
    const weeks = ['2025-W01', '2025-W24', '2025-W52', '2020-W53', '2026-W01']
    for (const week of weeks) {
      const monday = getDateFromWeek(week)
      expect(getIsoWeekString(monday)).toBe(week)
    }
  })
})
