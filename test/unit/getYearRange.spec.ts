import { describe, it, expect } from 'vitest'
import { getYearRange } from '~~/shared/utils/dateRanges'

describe('getYearRange', () => {
  it('returns full year range', () => {
    const [start, end] = getYearRange(new Date(2025, 5, 15))
    expect(start.getFullYear()).toBe(2025)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getFullYear()).toBe(2025)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
    expect(end.getHours()).toBe(23)
  })

  it('handles a leap year', () => {
    const [start, end] = getYearRange(new Date(2024, 5, 15))
    expect(start.getFullYear()).toBe(2024)
    expect(end.getFullYear()).toBe(2024)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
  })
})
