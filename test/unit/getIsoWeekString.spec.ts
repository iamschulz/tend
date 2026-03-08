import { describe, it, expect } from 'vitest'
import { getIsoWeekString } from '~/util/getIsoWeekString'

describe('getIsoWeekString', () => {
  it('returns correct week for a standard mid-year date', () => {
    // 2025-06-11 is in ISO week 24
    expect(getIsoWeekString(new Date(2025, 5, 11))).toBe('2025-W24')
  })

  it('returns week 1 for early January', () => {
    // 2025-01-01 is a Wednesday, still ISO week 1 of 2025
    expect(getIsoWeekString(new Date(2025, 0, 1))).toBe('2025-W01')
  })

  it('handles year boundary where Dec 31 falls in week 1 of next year', () => {
    // 2025-12-31 is a Wednesday — ISO week 1 of 2026
    expect(getIsoWeekString(new Date(2025, 11, 31))).toBe('2026-W01')
  })

  it('handles week 52', () => {
    // 2025-12-22 is a Monday — ISO week 52 of 2025
    expect(getIsoWeekString(new Date(2025, 11, 22))).toBe('2025-W52')
  })

  it('handles a year with week 53', () => {
    // 2020-12-31 is a Thursday — ISO week 53 of 2020
    expect(getIsoWeekString(new Date(2020, 11, 31))).toBe('2020-W53')
  })
})
