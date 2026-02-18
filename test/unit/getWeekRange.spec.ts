import { describe, it, expect } from 'vitest'
import { getWeekRange } from '~/util/getWeekRange'

describe('getWeekRange', () => {
  it('returns Monday–Sunday for a mid-week date (Wednesday)', () => {
    // 2025-06-11 is a Wednesday
    const [start, end] = getWeekRange(new Date('2025-06-11T12:00:00Z'))
    expect(start.toISOString()).toBe('2025-06-09T00:00:00.000Z') // Monday
    expect(end.toISOString()).toBe('2025-06-15T23:59:59.999Z')   // Sunday
  })

  it('handles a Sunday input', () => {
    // 2025-06-15 is a Sunday
    const [start, end] = getWeekRange(new Date('2025-06-15T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-06-09T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-06-15T23:59:59.999Z')
  })

  it('handles a Monday input', () => {
    // 2025-06-09 is a Monday
    const [start, end] = getWeekRange(new Date('2025-06-09T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-06-09T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-06-15T23:59:59.999Z')
  })

  it('handles a year-spanning week', () => {
    // 2024-12-30 is a Monday, week spans into 2025
    const [start, end] = getWeekRange(new Date('2024-12-30T00:00:00Z'))
    expect(start.toISOString()).toBe('2024-12-30T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-01-05T23:59:59.999Z')
  })
})
