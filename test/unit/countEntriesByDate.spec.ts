import { describe, it, expect } from 'vitest'
import { countEntriesByDate, dateKey } from '~/util/countEntriesByDate'
import type { Entry } from '~/types/Entry'

let entryCounter = 0

/**
 * Builds a completed entry between two local timestamps.
 * @param start - Start date
 * @param end - End date, or null for a running entry
 */
function makeEntry(start: Date, end: Date | null): Entry {
  return {
    id: `entry-${entryCounter++}`,
    start: start.getTime(),
    end: end?.getTime() ?? null,
    running: end === null,
    categoryId: 'cat',
    comment: '',
  }
}

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min)

describe('dateKey', () => {
  it('pads month and day', () => {
    expect(dateKey(at(2025, 0, 5, 12))).toBe('2025-01-05')
    expect(dateKey(at(2025, 11, 31, 23))).toBe('2025-12-31')
  })
})

describe('countEntriesByDate', () => {
  it('counts an entry that starts and ends on the same day once', () => {
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 10), at(2025, 5, 11, 12))])
    expect([...counts]).toEqual([['2025-06-11', 1]])
  })

  it('counts an entry that runs past midnight on both days', () => {
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 22), at(2025, 5, 12, 2))])
    expect(counts.get('2025-06-11')).toBe(1)
    expect(counts.get('2025-06-12')).toBe(1)
  })

  it('counts every day a long entry covers, ends included', () => {
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 22), at(2025, 5, 14, 1))])
    expect([...counts.keys()].sort()).toEqual(['2025-06-11', '2025-06-12', '2025-06-13', '2025-06-14'])
  })

  it('counts an entry ending exactly at midnight on the day it starts', () => {
    // 23:00 to 00:00 is a day boundary, not a second day.
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 23), at(2025, 5, 12, 0))])
    expect(counts.get('2025-06-11')).toBe(1)
    expect(counts.get('2025-06-12')).toBe(1)
  })

  it('carries a spanning entry across a year boundary', () => {
    const counts = countEntriesByDate([makeEntry(at(2025, 11, 31, 22), at(2026, 0, 1, 1))])
    expect(counts.get('2025-12-31')).toBe(1)
    expect(counts.get('2026-01-01')).toBe(1)
  })

  it('counts a running entry up to now', () => {
    const now = at(2025, 5, 13, 9).getTime()
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 22), null)], now)
    expect([...counts.keys()].sort()).toEqual(['2025-06-11', '2025-06-12', '2025-06-13'])
  })

  it('adds up entries that share a day', () => {
    const counts = countEntriesByDate([
      makeEntry(at(2025, 5, 11, 22), at(2025, 5, 12, 2)),
      makeEntry(at(2025, 5, 12, 9), at(2025, 5, 12, 10)),
    ])
    expect(counts.get('2025-06-11')).toBe(1)
    expect(counts.get('2025-06-12')).toBe(2)
  })

  it('keeps an entry that ends before it starts on its start day', () => {
    const counts = countEntriesByDate([makeEntry(at(2025, 5, 11, 22), at(2025, 5, 10, 1))])
    expect([...counts]).toEqual([['2025-06-11', 1]])
  })

  it('returns an empty map for no entries', () => {
    expect([...countEntriesByDate([])]).toEqual([])
  })
})
