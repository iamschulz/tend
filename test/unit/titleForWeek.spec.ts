import { describe, it, expect, vi, afterEach } from 'vitest'
import { titleForWeek } from '~/util/titleForWeek'
import { mockT } from './_helpers'

describe('titleForWeek', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns title and links for a valid week string', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForWeek('2025-W20', mockT, 'en')
    expect(result).not.toBeNull()
    expect(result!.short).toContain('–')
    expect(result!.long).toContain('weekOf')
    expect(result!.prevLink).toMatch(/^\/week\/\d{4}-W\d{2}$/)
    expect(result!.nextLink).toMatch(/^\/week\/\d{4}-W\d{2}$/)
  })

  it('returns no nextLink for the current week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 11, 12))

    // 2025-06-11 is in W24
    const result = titleForWeek('2025-W24', mockT, 'en')
    expect(result).not.toBeNull()
    expect(result!.nextLink).toBeNull()
  })

  it('generates correct prev/next links', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12))

    const result = titleForWeek('2025-W20', mockT, 'en')
    expect(result).not.toBeNull()
    expect(result!.prevLink).toBe('/week/2025-W19')
    expect(result!.nextLink).toBe('/week/2025-W21')
  })
})
