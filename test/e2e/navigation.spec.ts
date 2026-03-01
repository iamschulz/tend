import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
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

describe('Navigation', () => {
  let page: Page

  beforeAll(async () => {
    await startServer()
    await launchBrowser()
  })

  afterAll(async () => {
    await closeBrowser()
    stopServer()
  })

  beforeEach(async () => {
    page = await getPage('/')
  })

  afterEach(async () => {
    await page.close()
  })

  it('home page loads with header title', async () => {
    const title = await page.$('h1.title')
    expect(title).not.toBeNull()
    const text = await page.$eval('h1.title', (el) => el.textContent?.trim())
    expect(text).toBeTruthy()
  })

  it('menu opens and closes', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })

    const isOpen = await page.$('dialog.menu[open]')
    expect(isOpen).not.toBeNull()

    await page.click('dialog.menu .closeButton')
    await page.waitForFunction(
      () => !document.querySelector('dialog.menu[open]'),
      { timeout: 3000 },
    )

    const isClosed = await page.$('dialog.menu[open]')
    expect(isClosed).toBeNull()
  })

  it('navigates to week view via menu', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })

    // Open the "Select Day" details section (may be closed when no categories exist)
    await ensureSelectDayOpen(page)

    // Click the "Week" button in the time select section
    const buttons = await page.$$('dialog.menu .selectMenu [data-group]:last-child button')
    const weekButton = buttons[1] // Day, Week, Month, Year — index 1
    expect(weekButton).not.toBeNull()
    await weekButton!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/week/'), { timeout: 5000 })
    expect(page.url()).toContain('/week/')
  })

  it('navigates to month view via menu', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })
    await ensureSelectDayOpen(page)

    const buttons = await page.$$('dialog.menu .selectMenu [data-group]:last-child button')
    const monthButton = buttons[2] // Day, Week, Month, Year — index 2
    expect(monthButton).not.toBeNull()
    await monthButton!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/month/'), { timeout: 5000 })
    expect(page.url()).toContain('/month/')
  })

  it('navigates to year view via menu', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })
    await ensureSelectDayOpen(page)

    const buttons = await page.$$('dialog.menu .selectMenu [data-group]:last-child button')
    const yearButton = buttons[3] // Day, Week, Month, Year — index 3
    expect(yearButton).not.toBeNull()
    await yearButton!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/year/'), { timeout: 5000 })
    expect(page.url()).toContain('/year/')
  })

  it('header prev/next arrows navigate days', async () => {
    // Navigate to yesterday's day page
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)

    await navigateTo(page, `/day/${yStr}`)

    // Click next arrow
    const nextArrow = await page.$('h1.title a.nav-link:last-of-type')
    expect(nextArrow).not.toBeNull()

    const urlBefore = page.url()
    await nextArrow!.click()

    // Wait for URL to change away from yesterday's page
    await page.waitForFunction(
      (prevUrl: string) => window.location.href !== prevUrl,
      urlBefore,
      { timeout: 5000 },
    )

    // Should have navigated away from yesterday (could be / for today or /day/today)
    expect(page.url()).not.toContain(yStr)
  })

  it('shows future message for future day', async () => {
    // Close the default page and reopen in a timezone behind UTC (UTC-10).
    // With the clock pinned to March 2 08:00 UTC (= March 1 22:00 HST),
    // the local date is March 1, so March 2 is "tomorrow" for the user.
    // The buggy UTC-based comparison in getDayRange treats March 2 as
    // "today", hiding the future message.
    await page.close()
    page = await getPage('/', { timezoneId: 'Pacific/Honolulu' })
    await page.clock.setFixedTime(new Date('2026-03-02T08:00:00Z'))

    await navigateTo(page, '/day/2026-03-02')

    const text = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('#__nuxt p')
      return Array.from(paragraphs).map((p) => p.textContent?.trim()).join(' ')
    })
    expect(text).toContain('awesome')
  })
})
