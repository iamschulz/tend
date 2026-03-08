import { describe, it, expect } from 'vitest'
import { getDayRange } from '~/util/getDayRange'

describe('getDayRange', () => {
  it('returns start and end of a mid-month date', () => {
    const [start, end] = getDayRange(new Date(2025, 5, 15, 12)) // June 15 noon local
    expect(start.getFullYear()).toBe(2025)
    expect(start.getMonth()).toBe(5)
    expect(start.getDate()).toBe(15)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getDate()).toBe(15)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })

  it('handles month boundary (last day)', () => {
    const [start, end] = getDayRange(new Date(2025, 0, 31)) // Jan 31
    expect(start.getDate()).toBe(31)
    expect(end.getDate()).toBe(31)
    expect(end.getHours()).toBe(23)
  })

  it('handles year boundary (Jan 1)', () => {
    const [start, end] = getDayRange(new Date(2025, 0, 1)) // Jan 1
    expect(start.getFullYear()).toBe(2025)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(1)
    expect(end.getHours()).toBe(23)
  })

  it('uses local midnight, not UTC midnight', () => {
    const d = new Date(2025, 5, 15)
    const [start, end] = getDayRange(d)
    // Local midnight must equal new Date(y, m, d), NOT Date.UTC(y, m, d)
    expect(start.getTime()).toBe(new Date(2025, 5, 15, 0, 0, 0, 0).getTime())
    expect(end.getTime()).toBe(new Date(2025, 5, 15, 23, 59, 59, 999).getTime())
  })
})
