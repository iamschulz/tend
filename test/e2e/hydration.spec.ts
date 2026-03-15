import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { Page, ConsoleMessage } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  ensureSelectDayOpen,
  ensureCategoriesOpen,
} from './_setup'
import { addCategory, quickClickTrigger, openMenu } from './_helpers'

describe('Hydration – full navigation flow', () => {
  let page: Page
  const errors: string[] = []

  beforeAll(async () => {
    await startServer()
    await launchBrowser()
  })

  afterAll(async () => {
    await closeBrowser()
    stopServer()
  })

  afterEach(async () => {
    await page?.close()
  })

  it('navigates through all views without hydration errors or console errors', async () => {
    // --- Setup: open index, collect console errors ---
    page = await getPage('/')

    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text()
      if (msg.type() === 'error' || text.includes('Hydration') || text.includes('mismatch')) {
        errors.push(text)
      }
    })

    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    // --- Create a category and an entry ---
    await addCategory(page, 'Hydration Test')
    await quickClickTrigger(page)

    // --- Click the entry to navigate to the entry page ---
    const entryLink = await page.$('article.track [data-card-link]')
    expect(entryLink).not.toBeNull()
    await entryLink!.click()

    await page.waitForFunction(
      () => window.location.pathname.startsWith('/entry/'),
      undefined,
      { timeout: 5000 },
    )
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    expect(page.url()).toContain('/entry/')

    // --- Menu → Week ---
    await openMenu(page)
    await ensureSelectDayOpen(page)

    const weekBtn = (await page.$$('dialog.menu .selectMenu [data-group]:last-child button'))[1]
    expect(weekBtn).not.toBeNull()
    await weekBtn!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/week/'), undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    expect(page.url()).toContain('/week/')

    // --- Menu → Month ---
    await openMenu(page)
    await ensureSelectDayOpen(page)

    const monthBtn = (await page.$$('dialog.menu .selectMenu [data-group]:last-child button'))[2]
    expect(monthBtn).not.toBeNull()
    await monthBtn!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/month/'), undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    expect(page.url()).toContain('/month/')

    // --- Menu → Year ---
    await openMenu(page)
    await ensureSelectDayOpen(page)

    const yearBtn = (await page.$$('dialog.menu .selectMenu [data-group]:last-child button'))[3]
    expect(yearBtn).not.toBeNull()
    await yearBtn!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/year/'), undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    expect(page.url()).toContain('/year/')

    // --- Menu → Category page ---
    await openMenu(page)
    await ensureCategoriesOpen(page)

    const editLink = await page.$('dialog.menu li .categoryForm a[data-button]')
    expect(editLink).not.toBeNull()
    await editLink!.click()

    await page.waitForFunction(
      () => window.location.pathname.startsWith('/category/'),
      undefined,
      { timeout: 5000 },
    )
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    expect(page.url()).toContain('/category/')

    // --- Assert no errors were collected ---
    expect(errors).toEqual([])
  })
})
