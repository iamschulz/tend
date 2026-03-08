import { describe, it, expect } from 'vitest'
import { toLocalDateStr } from '~/util/toLocalDateStr'

describe('toLocalDateStr', () => {
  it('formats a standard date using local components', () => {
    const d = new Date(2025, 5, 15) // June 15 2025, local midnight
    expect(toLocalDateStr(d)).toBe('2025-06-15')
  })

  it('pads single-digit month and day', () => {
    const d = new Date(2025, 0, 5) // Jan 5 2025, local midnight
    expect(toLocalDateStr(d)).toBe('2025-01-05')
  })

  it('handles year boundary (Dec 31)', () => {
    const d = new Date(2024, 11, 31) // Dec 31 2024, local midnight
    expect(toLocalDateStr(d)).toBe('2024-12-31')
  })

  it('handles year boundary (Jan 1)', () => {
    const d = new Date(2025, 0, 1) // Jan 1 2025, local midnight
    expect(toLocalDateStr(d)).toBe('2025-01-01')
  })
})
