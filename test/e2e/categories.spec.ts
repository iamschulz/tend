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
import { addCategory } from './_helpers'

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
    const triggerButtons = await page.$$('[data-avatar] button')
    expect(triggerButtons.length).toBe(1)
  })

  it('adds a second category', async () => {
    await addCategory(page, 'Running')

    // After first add, details may have closed, so ensureCategoriesOpen will handle reopening
    await addCategory(page, 'Reading')

    // Two trigger buttons should appear
    const triggerButtons = await page.$$('[data-avatar] button')
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

  it('deletes a category with confirm', async () => {
    await addCategory(page, 'Cooking', { keepMenuOpen: true })

    await ensureCategoriesOpen(page)

    // Category should be in the list
    let editInputs = await page.$$('dialog.menu li .categoryForm input[type="text"]')
    expect(editInputs.length).toBe(1)

    // Click the delete button on the edit form (the non-submit button)
    await page.click('dialog.menu li .categoryForm button:not([type="submit"])')

    // Confirm dialog should appear
    await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })

    // Click confirm
    await page.click('dialog.confirm-dialog button[data-variant="primary"]')

    // Wait for the category to disappear
    await page.waitForFunction(
      () => document.querySelectorAll('dialog.menu li .categoryForm input[type="text"]').length === 0,
      { timeout: 5000 },
    )

    editInputs = await page.$$('dialog.menu li .categoryForm input[type="text"]')
    expect(editInputs.length).toBe(0)
  })

  it('cancels category deletion', async () => {
    await addCategory(page, 'Swimming', { keepMenuOpen: true })

    await ensureCategoriesOpen(page)

    // Click the delete button
    await page.click('dialog.menu li .categoryForm button:not([type="submit"])')

    // Confirm dialog should appear
    await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })

    // Click cancel (first button in confirm-actions)
    const cancelBtn = await page.$('dialog.confirm-dialog .confirm-actions button:first-child')
    expect(cancelBtn).not.toBeNull()
    await cancelBtn!.click()

    // Wait for confirm dialog to close
    await page.waitForFunction(
      () => !document.querySelector('dialog.confirm-dialog[open]'),
      { timeout: 3000 },
    )

    // Category should still exist
    const editInputs = await page.$$('dialog.menu li .categoryForm input[type="text"]')
    expect(editInputs.length).toBe(1)
  })
})
