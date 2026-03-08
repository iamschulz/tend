import { describe, it, expect } from 'vitest'
import { getMonthRange } from '~/util/getMonthRange'

describe('getMonthRange', () => {
  it('returns full month range for a regular month', () => {
    const [start, end] = getMonthRange(new Date(2025, 5, 15)) // June
    expect(start.getMonth()).toBe(5)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(end.getMonth()).toBe(5)
    expect(end.getDate()).toBe(30)
    expect(end.getHours()).toBe(23)
  })

  it('handles February in a non-leap year', () => {
    const [start, end] = getMonthRange(new Date(2025, 1, 10)) // Feb
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(28)
  })

  it('handles February in a leap year', () => {
    const [start, end] = getMonthRange(new Date(2024, 1, 10)) // Feb 2024
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(29)
  })

  it('handles December', () => {
    const [start, end] = getMonthRange(new Date(2025, 11, 15)) // Dec
    expect(start.getMonth()).toBe(11)
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
  })

  it('uses local midnight, not UTC midnight', () => {
    const [start, end] = getMonthRange(new Date(2025, 5, 15))
    expect(start.getTime()).toBe(new Date(2025, 5, 1, 0, 0, 0, 0).getTime())
    expect(end.getTime()).toBe(new Date(2025, 5, 30, 23, 59, 59, 999).getTime())
  })
})
