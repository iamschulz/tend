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

    // Click the "Week" link in the time select section
    const links = await page.$$('dialog.menu .selectMenu a')
    const weekLink = links[1] // Today, Week, Month, Year — index 1
    expect(weekLink).not.toBeNull()
    await weekLink!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/week/'), { timeout: 5000 })
    expect(page.url()).toContain('/week/')
  })

  it('navigates to month view via menu', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })
    await ensureSelectDayOpen(page)

    const links = await page.$$('dialog.menu .selectMenu a')
    const monthLink = links[2]
    expect(monthLink).not.toBeNull()
    await monthLink!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/month/'), { timeout: 5000 })
    expect(page.url()).toContain('/month/')
  })

  it('navigates to year view via menu', async () => {
    await page.click('header button.nobutton')
    await page.waitForSelector('dialog.menu[open]', { timeout: 3000 })
    await ensureSelectDayOpen(page)

    const links = await page.$$('dialog.menu .selectMenu a')
    const yearLink = links[3]
    expect(yearLink).not.toBeNull()
    await yearLink!.click()

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

  it('future date shows future message', async () => {
    await navigateTo(page, '/day/2099-01-01')

    // The future message text should be visible
    const text = await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('#__nuxt p')
      return Array.from(paragraphs).map((p) => p.textContent?.trim()).join(' ')
    })
    expect(text).toContain('awesome')
  })
})
