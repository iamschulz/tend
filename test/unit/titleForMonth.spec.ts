import { describe, it, expect, vi, afterEach } from 'vitest'
import { titleForMonth } from '~/util/titleForMonth'

describe('titleForMonth', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns title and links for a valid month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForMonth('2025-03', 'en')
    expect(result).not.toBeNull()
    expect(result!.prevLink).toBe('/month/2025-02')
    expect(result!.nextLink).toBe('/month/2025-04')
  })

  it('returns no nextLink for the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForMonth('2025-06', 'en')
    expect(result).not.toBeNull()
    expect(result!.nextLink).toBeNull()
  })

  it('handles January (prev crosses year boundary)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12))

    const result = titleForMonth('2025-01', 'en')
    expect(result).not.toBeNull()
    expect(result!.prevLink).toBe('/month/2024-12')
    expect(result!.nextLink).toBe('/month/2025-02')
  })

  it('handles December to January transition', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12))

    const result = titleForMonth('2025-12', 'en')
    expect(result).not.toBeNull()
    expect(result!.prevLink).toBe('/month/2025-11')
    expect(result!.nextLink).toBe('/month/2026-01')
  })
})
