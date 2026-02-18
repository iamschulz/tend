import { describe, it, expect } from 'vitest'
import { getMonthRange } from '~/util/getMonthRange'

describe('getMonthRange', () => {
  it('returns full month range for a regular month', () => {
    const [start, end] = getMonthRange(new Date('2025-06-15T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-06-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-06-30T23:59:59.999Z')
  })

  it('handles February in a non-leap year', () => {
    const [start, end] = getMonthRange(new Date('2025-02-10T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-02-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-02-28T23:59:59.999Z')
  })

  it('handles February in a leap year', () => {
    const [start, end] = getMonthRange(new Date('2024-02-10T00:00:00Z'))
    expect(start.toISOString()).toBe('2024-02-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2024-02-29T23:59:59.999Z')
  })

  it('handles December', () => {
    const [start, end] = getMonthRange(new Date('2025-12-15T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-12-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-12-31T23:59:59.999Z')
  })
})
