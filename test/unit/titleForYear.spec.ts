import { describe, it, expect, vi, afterEach } from 'vitest'
import { titleForYear } from '~/util/titleForYear'

describe('titleForYear', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns title and links for a valid year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    const result = titleForYear('2023')
    expect(result).not.toBeNull()
    expect(result!.short).toBe('2023')
    expect(result!.long).toBe('2023')
    expect(result!.prevLink).toBe('/year/2022')
    expect(result!.nextLink).toBe('/year/2024')
  })

  it('returns no nextLink for the current year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'))

    const result = titleForYear('2025')
    expect(result).not.toBeNull()
    expect(result!.nextLink).toBeNull()
    expect(result!.prevLink).toBe('/year/2024')
  })

  it('returns null for non-numeric input', () => {
    expect(titleForYear('abc')).toBeNull()
  })

  it('returns null for Infinity', () => {
    expect(titleForYear('Infinity')).toBeNull()
  })
})
