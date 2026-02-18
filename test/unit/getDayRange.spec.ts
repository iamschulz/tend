import { describe, it, expect } from 'vitest'
import { getDayRange } from '~/util/getDayRange'

describe('getDayRange', () => {
  it('returns start and end of a mid-month date', () => {
    const [start, end] = getDayRange(new Date('2025-06-15T12:00:00Z'))
    expect(start.toISOString()).toBe('2025-06-15T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-06-15T23:59:59.999Z')
  })

  it('handles month boundary (last day)', () => {
    const [start, end] = getDayRange(new Date('2025-01-31T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-01-31T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-01-31T23:59:59.999Z')
  })

  it('handles year boundary (Jan 1)', () => {
    const [start, end] = getDayRange(new Date('2025-01-01T00:00:00Z'))
    expect(start.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2025-01-01T23:59:59.999Z')
  })
})
