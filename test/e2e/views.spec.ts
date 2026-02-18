import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'puppeteer'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  navigateTo,
  ensureCategoriesOpen,
} from './_setup'
import {
  openMenu,
  closeMenu,
  addCategory,
  quickClickTrigger,
  getCurrentWeekStr,
  getCurrentMonthStr,
  getCurrentYearStr,
} from './_helpers'

describe('Views', () => {
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

  it('week view shows 7 day columns', async () => {
    await addCategory(page, 'WeekTest')
    await quickClickTrigger(page)

    await navigateTo(page, `/week/${getCurrentWeekStr()}`)

    // 7 day columns (each is a ul.weekday)
    const dayColumns = await page.$$('.weekday')
    expect(dayColumns.length).toBe(7)

    // Check that an entry exists somewhere in the week view
    const weekEntries = await page.$$('.week-entry')
    expect(weekEntries.length).toBeGreaterThan(0)
  })

  it('month view shows calendar grid', async () => {
    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    const table = await page.$('table.month-grid')
    expect(table).not.toBeNull()

    const headers = await page.$$('.weekday-header')
    expect(headers.length).toBe(7)

    // Today should be highlighted
    const todayCell = await page.$('td.today')
    expect(todayCell).not.toBeNull()
  })

  it('month view day cell links to day view', async () => {
    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    // Click today's cell link
    const todayLink = await page.$('td.today .day-link')
    expect(todayLink).not.toBeNull()
    await todayLink!.click()

    await page.waitForFunction(() => window.location.pathname.startsWith('/day/'), { timeout: 5000 })
    expect(page.url()).toMatch(/\/day\/\d{4}-\d{2}-\d{2}/)
  })

  it('year view shows 12 months', async () => {
    await navigateTo(page, `/year/${getCurrentYearStr()}`)

    const yearGrid = await page.$('.year-grid')
    expect(yearGrid).not.toBeNull()

    const monthItems = await page.$$('.year-grid [role="listitem"]')
    expect(monthItems.length).toBe(12)

    const currentMonth = await page.$('.year-grid .current-month')
    expect(currentMonth).not.toBeNull()
  })

  it('trigger button adds entry visible on week view', async () => {
    await addCategory(page, 'WeekEntry')
    await quickClickTrigger(page)

    await navigateTo(page, `/week/${getCurrentWeekStr()}`)

    const weekEntries = await page.$$('.week-entry')
    expect(weekEntries.length).toBeGreaterThan(0)

    const icon = await page.$('.week-entry .icon')
    expect(icon).not.toBeNull()
  })

  it('trigger button adds entry visible on month view', async () => {
    await addCategory(page, 'MonthEntry')
    await quickClickTrigger(page)

    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    // Today's cell should show a category dot
    const dot = await page.$('td.today .category-dot')
    expect(dot).not.toBeNull()

    // Entry count should be "1"
    const count = await page.$eval('td.today .entry-count', (el) => el.textContent?.trim())
    expect(count).toBe('1')
  })

  it('trigger button adds entry visible on year view', async () => {
    await addCategory(page, 'YearEntry')
    await quickClickTrigger(page)

    await navigateTo(page, `/year/${getCurrentYearStr()}`)

    const dot = await page.$('.current-month .category-dot')
    expect(dot).not.toBeNull()

    const count = await page.$eval('.current-month .entry-count', (el) => el.textContent?.trim())
    expect(count).toBe('1')
  })

  it('category color change reflects on month overview', async () => {
    await addCategory(page, 'ColorTest')
    await quickClickTrigger(page)

    // Open menu and change the category color
    await openMenu(page)
    await ensureCategoriesOpen(page)

    const colorInput = await page.$('dialog.menu li .categoryForm input[type="color"]')
    expect(colorInput).not.toBeNull()

    // Set color to a known value via input value setter + events
    await colorInput!.evaluate((el) => {
      const input = el as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '#ff0000')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Wait a moment for Vue watcher to update
    await new Promise((r) => setTimeout(r, 500))

    await closeMenu(page)

    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    // The dot's --categoryColor should use the new color
    const dotStyle = await page.$eval('td.today .category-dot', (el) => el.getAttribute('style'))
    expect(dotStyle).toContain('ff0000')
  })

  it('category deletion removes dots from overview', async () => {
    await addCategory(page, 'DeleteDots')
    await quickClickTrigger(page)

    // Delete the category
    await openMenu(page)
    await ensureCategoriesOpen(page)
    await page.click('dialog.menu li .categoryForm button:not([type="submit"])')
    await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })
    await page.click('dialog.confirm-dialog button[data-variant="primary"]')

    await page.waitForFunction(
      () => document.querySelectorAll('dialog.menu li .categoryForm input[type="text"]').length === 0,
      { timeout: 5000 },
    )

    await closeMenu(page)

    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    // Today's cell should NOT have any category dots
    const dot = await page.$('td.today .category-dot')
    expect(dot).toBeNull()

    // No entry count either
    const count = await page.$('td.today .entry-count')
    expect(count).toBeNull()
  })

  it('adding entries from two categories shows two dots on month view', async () => {
    await addCategory(page, 'Cat One')
    await addCategory(page, 'Cat Two')

    // Click first trigger
    await quickClickTrigger(page, 0)

    // Wait for entry to settle
    await new Promise((r) => setTimeout(r, 500))

    // Add an entry for the category that doesn't have one yet via the reactive Pinia store.
    // This avoids issues with clicking overlapping fixed-position trigger buttons.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await page.evaluate(() => {
      const el = document.querySelector('#__nuxt') as any
      const app = el?.__vue_app__
      if (!app) return
      const pinia = app.config.globalProperties.$pinia
      const state = pinia.state.value.data
      const emptyCat = state.categories.find((c: any) => c.entries.length === 0)
      if (!emptyCat) return
      const now = Date.now()
      emptyCat.entries.push({
        id: crypto.randomUUID(),
        start: now,
        end: now,
        running: false,
        categoryId: emptyCat.id,
      })
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Wait for Vue reactivity + persist plugin to flush
    await new Promise((r) => setTimeout(r, 500))

    await navigateTo(page, `/month/${getCurrentMonthStr()}`)

    // Today's cell should have 2 category dots
    const dots = await page.$$('td.today .category-dot')
    expect(dots.length).toBe(2)

    // Entry count should be "2"
    const count = await page.$eval('td.today .entry-count', (el) => el.textContent?.trim())
    expect(count).toBe('2')
  })
})
