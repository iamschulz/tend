import { describe, it, expect, vi, afterEach } from 'vitest'
import { titleForDay } from '~/util/titleForDay'
import { mockT } from './_helpers'

describe('titleForDay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "today" labels and no nextLink for today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForDay(new Date(2025, 5, 15), mockT, 'en')
    expect(result.short).toBe('today')
    expect(result.long).toBe('today')
    expect(result.nextLink).toBeNull()
    expect(result.prevLink).toBe('/day/2025-06-14')
  })

  it('returns "yesterday" labels for yesterday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForDay(new Date(2025, 5, 14), mockT, 'en')
    expect(result.short).toBe('yesterday')
    expect(result.long).toBe('yesterday')
    expect(result.nextLink).toBe('/')
    expect(result.prevLink).toBe('/day/2025-06-13')
  })

  it('returns locale-formatted title for an arbitrary past date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForDay(new Date(2025, 5, 10), mockT, 'en')
    // Should not be "today" or "yesterday"
    expect(result.short).not.toBe('today')
    expect(result.short).not.toBe('yesterday')
    expect(result.prevLink).toBe('/day/2025-06-09')
    expect(result.nextLink).toBe('/day/2025-06-11')
  })

  it('generates nextLink as "/" when next day is today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForDay(new Date(2025, 5, 14), mockT, 'en')
    expect(result.nextLink).toBe('/')
  })

  it('uses local date for "today" detection, not UTC', () => {
    vi.useFakeTimers()
    // 1 AM local — in positive-offset timezones the UTC date is the previous day
    vi.setSystemTime(new Date(2025, 5, 15, 1))

    const result = titleForDay(new Date(2025, 5, 15, 0), mockT, 'en')
    // Must still be "today" based on local date, not UTC
    expect(result.short).toBe('today')
  })
})
