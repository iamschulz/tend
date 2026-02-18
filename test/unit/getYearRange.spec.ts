import { describe, it, expect } from 'vitest'
import { getYearRange } from '~/util/getYearRange'

describe('getYearRange', () => {
  it('returns full year range', () => {
    const [start, end] = getYearRange(new Date('2025-06-15T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-12-31T23:59:59.999Z')
  })

  it('handles a leap year', () => {
    const [start, end] = getYearRange(new Date('2024-06-15T00:00:00Z'))
    expect(start.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2024-12-31T23:59:59.999Z')
  })
})
