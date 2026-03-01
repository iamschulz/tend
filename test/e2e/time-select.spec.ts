import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  navigateTo,
  ensureSelectDayOpen,
} from './_setup'
import { openMenu, closeMenu } from './_helpers'

/** Open menu, ensure select-day section is visible, return the date input value. */
async function getDateInputValue(page: Page): Promise<string> {
  await openMenu(page)
  await ensureSelectDayOpen(page)
  return page.$eval('.selectMenu input[type="date"]', (el) => (el as HTMLInputElement).value)
}

describe('Time select date input syncs with route', () => {
  let page: Page

  beforeAll(async () => {
    await startServer()
    await launchBrowser()
  })

  afterAll(async () => {
    await closeBrowser()
    stopServer()
  })

  afterEach(async () => {
    await page.close()
  })

  it('defaults to today on home page', async () => {
    page = await getPage('/', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    const today = new Date().toISOString().slice(0, 10)
    expect(value).toBe(today)
  })

  it('shows the date from /day/:date route', async () => {
    page = await getPage('/day/2025-06-15', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    expect(value).toBe('2025-06-15')
  })

  it('shows Monday of the week from /week/:date route', async () => {
    // 2025-W10 → Monday March 3, 2025
    page = await getPage('/week/2025-W10', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    expect(value).toBe('2025-03-03')
  })

  it('shows first day of month from /month/:date route', async () => {
    page = await getPage('/month/2025-03', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    expect(value).toBe('2025-03-01')
  })

  it('shows January 1st from /year/:date route', async () => {
    page = await getPage('/year/2024', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    expect(value).toBe('2024-01-01')
  })

  it('updates when navigating between routes', async () => {
    page = await getPage('/day/2025-06-15', { timezoneId: 'UTC' })

    let value = await getDateInputValue(page)
    expect(value).toBe('2025-06-15')

    await closeMenu(page)
    await navigateTo(page, '/month/2025-01')

    value = await getDateInputValue(page)
    expect(value).toBe('2025-01-01')
  })

  it('defaults to today for invalid day route', async () => {
    page = await getPage('/day/not-a-date', { timezoneId: 'UTC' })
    const value = await getDateInputValue(page)
    const today = new Date().toISOString().slice(0, 10)
    expect(value).toBe(today)
  })
})
