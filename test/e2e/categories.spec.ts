import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'puppeteer'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  ensureCategoriesOpen,
} from './_setup'
import { addCategory, openMenu, closeMenu, quickClickTrigger, waitForAnnouncement, getAnnouncement } from './_helpers'

describe('Categories', () => {
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

  it('first-time experience shows prompt', async () => {
    // With no categories, the first-steps component should be visible with "What habit" text
    const text = await page.evaluate(() => {
      const el = document.querySelector('#__nuxt')
      return el?.textContent ?? ''
    })
    expect(text).toContain('What habit do you want to track?')
  })

  it('adds a category', async () => {
    await addCategory(page, 'Meditation')

    // Trigger button should now appear (inside [data-avatar])
    const triggerButtons = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
    expect(triggerButtons.length).toBe(1)

    // Announcer should mention the added category
    await waitForAnnouncement(page, 'Meditation')
    const announcement = await getAnnouncement(page)
    expect(announcement.toLowerCase()).toContain('add')
    expect(announcement).toContain('Meditation')
  })

  it('adds a second category', async () => {
    await addCategory(page, 'Running')

    // After first add, details may have closed, so ensureCategoriesOpen will handle reopening
    await addCategory(page, 'Reading')

    // Two trigger buttons should appear
    const triggerButtons = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
    expect(triggerButtons.length).toBe(2)
  })

  it('edits a category title', async () => {
    await addCategory(page, 'Meditate', { keepMenuOpen: true })

    // Ensure categories section is open to access edit form
    await ensureCategoriesOpen(page)

    // The edit form should exist with the title in input[type="text"]
    const editInput = await page.$('dialog.menu li .categoryForm input[type="text"]')
    expect(editInput).not.toBeNull()

    // Clear and type new title
    await editInput!.click({ clickCount: 3 })
    await editInput!.type('Yoga')

    // Wait for the store watcher to apply
    await page.waitForFunction(
      () => {
        const inputs = document.querySelectorAll('dialog.menu li .categoryForm input[type="text"]')
        return Array.from(inputs).some((el) => (el as HTMLInputElement).value === 'Yoga')
      },
      { timeout: 3000 },
    )

    const value = await page.$eval(
      'dialog.menu li .categoryForm input[type="text"]',
      (el) => (el as HTMLInputElement).value,
    )
    expect(value).toBe('Yoga')
  })

  it('hides a category', async () => {
    await addCategory(page, 'Yoga')
    await quickClickTrigger(page, 0)

    // Trigger button and entry should be visible
    let triggers = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
    expect(triggers.length).toBe(1)
    let entries = await page.$$('article.track')
    expect(entries.length).toBe(1)

    // Open menu and toggle hide
    await openMenu(page)
    await ensureCategoriesOpen(page)
    const hideBtn = await page.$('dialog.menu li .categoryForm button')
    expect(hideBtn).not.toBeNull()
    await hideBtn!.click()

    // Wait for the hide button text to change to "Show" (meaning category is now hidden)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('dialog.menu li .categoryForm button')
        return btn?.textContent?.includes('Show')
      },
      { timeout: 3000 },
    )

    await closeMenu(page)

    // Trigger button should disappear
    await page.waitForFunction(
      () => document.querySelectorAll('[data-group] [data-avatar]:not(.allCategories) button').length === 0,
      { timeout: 5000 },
    )
    triggers = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
    expect(triggers.length).toBe(0)

    // Entry should disappear from day view
    entries = await page.$$('article.track')
    expect(entries.length).toBe(0)
  })

  it('shows a hidden category again', async () => {
    await addCategory(page, 'Reading')
    await quickClickTrigger(page, 0)

    // Hide the category
    await openMenu(page)
    await ensureCategoriesOpen(page)
    const hideBtn = await page.$('dialog.menu li .categoryForm button')
    await hideBtn!.click()
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('dialog.menu li .categoryForm button')
        return btn?.textContent?.includes('Show')
      },
      { timeout: 3000 },
    )
    await closeMenu(page)

    // Verify it's hidden
    await page.waitForFunction(
      () => document.querySelectorAll('[data-group] [data-avatar]:not(.allCategories) button').length === 0,
      { timeout: 5000 },
    )

    // Unhide the category
    await openMenu(page)
    await ensureCategoriesOpen(page)
    const showBtn = await page.$('dialog.menu li .categoryForm button')
    await showBtn!.click()
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('dialog.menu li .categoryForm button')
        return btn?.textContent?.includes('Hide')
      },
      { timeout: 3000 },
    )
    await closeMenu(page)

    // Trigger button should reappear
    await page.waitForSelector('[data-group] [data-avatar]:not(.allCategories) button', { timeout: 5000 })
    const triggers = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
    expect(triggers.length).toBe(1)

    // Entry should reappear in day view
    await page.waitForSelector('article.track', { timeout: 5000 })
    const entries = await page.$$('article.track')
    expect(entries.length).toBe(1)
  })
})
