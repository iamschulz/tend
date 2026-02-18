import { describe, it, expect } from 'vitest'
import { toUtcDateStr } from '~/util/toUtcDateStr'

describe('toUtcDateStr', () => {
  it('formats a standard date', () => {
    expect(toUtcDateStr(new Date('2025-06-15T00:00:00Z'))).toBe('2025-06-15')
  })

  it('pads single-digit month and day', () => {
    expect(toUtcDateStr(new Date('2025-01-05T00:00:00Z'))).toBe('2025-01-05')
  })

  it('handles year boundary (Dec 31)', () => {
    expect(toUtcDateStr(new Date('2024-12-31T23:59:59Z'))).toBe('2024-12-31')
  })

  it('handles year boundary (Jan 1)', () => {
    expect(toUtcDateStr(new Date('2025-01-01T00:00:00Z'))).toBe('2025-01-01')
  })
})
