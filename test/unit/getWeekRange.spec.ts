import { describe, it, expect } from 'vitest'
import { getWeekRange } from '~~/shared/utils/dateRanges'

describe('getWeekRange', () => {
  it('returns Monday–Sunday for a mid-week date (Wednesday)', () => {
    // 2025-06-11 is a Wednesday
    const [start, end] = getWeekRange(new Date(2025, 5, 11, 12))
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getDate()).toBe(9)
    expect(start.getHours()).toBe(0)
    expect(end.getDay()).toBe(0) // Sunday
    expect(end.getDate()).toBe(15)
    expect(end.getHours()).toBe(23)
  })

  it('handles a Sunday input', () => {
    // 2025-06-15 is a Sunday
    const [start, end] = getWeekRange(new Date(2025, 5, 15))
    expect(start.getDate()).toBe(9)
    expect(end.getDate()).toBe(15)
  })

  it('handles a Monday input', () => {
    // 2025-06-09 is a Monday
    const [start, end] = getWeekRange(new Date(2025, 5, 9))
    expect(start.getDate()).toBe(9)
    expect(end.getDate()).toBe(15)
  })

  it('handles a year-spanning week', () => {
    // 2024-12-30 is a Monday, week spans into 2025
    const [start, end] = getWeekRange(new Date(2024, 11, 30))
    expect(start.getFullYear()).toBe(2024)
    expect(start.getMonth()).toBe(11)
    expect(start.getDate()).toBe(30)
    expect(end.getFullYear()).toBe(2025)
    expect(end.getMonth()).toBe(0)
    expect(end.getDate()).toBe(5)
  })

  it('uses local midnight, not UTC midnight', () => {
    const [start, end] = getWeekRange(new Date(2025, 5, 11)) // Wed June 11
    // Monday local midnight
    expect(start.getTime()).toBe(new Date(2025, 5, 9, 0, 0, 0, 0).getTime())
    // Sunday 23:59:59.999 local
    expect(end.getTime()).toBe(new Date(2025, 5, 15, 23, 59, 59, 999).getTime())
  })
})
