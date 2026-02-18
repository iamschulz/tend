import { describe, it, expect } from 'vitest'
import { formatDuration } from '~/util/formatDuration'
import { mockT } from './_helpers'

describe('formatDuration', () => {
  it('shows seconds only for short durations', () => {
    const start = 0
    const end = 45_000 // 45 seconds
    expect(formatDuration(start, end, mockT)).toBe('45durationS')
  })

  it('shows minutes and omits seconds', () => {
    const start = 0
    const end = 5 * 60_000 + 30_000 // 5m 30s
    expect(formatDuration(start, end, mockT)).toBe('5durationM')
  })

  it('shows hours and minutes', () => {
    const start = 0
    const end = 2 * 3600_000 + 15 * 60_000 // 2h 15m
    expect(formatDuration(start, end, mockT)).toBe('2durationH 15durationM')
  })

  it('shows days, hours, and minutes', () => {
    const start = 0
    const end = 3 * 86400_000 + 4 * 3600_000 + 30 * 60_000 // 3d 4h 30m
    expect(formatDuration(start, end, mockT)).toBe('3durationD 4durationH 30durationM')
  })

  it('shows 0 seconds for zero duration', () => {
    expect(formatDuration(1000, 1000, mockT)).toBe('0durationS')
  })

  it('uses absolute value for negative (end < start)', () => {
    const start = 60_000
    const end = 0
    expect(formatDuration(start, end, mockT)).toBe('1durationM')
  })
})
