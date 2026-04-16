import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  navigateTo,
} from './_setup'
import { addCategory, getCurrentWeekStr } from './_helpers'

describe('Day notes', () => {
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
    // Seed a category so the FirstSteps view is replaced by the normal tracker
    await addCategory(page, 'NoteTest')
  })

  afterEach(async () => {
    await page.close()
  })

  /**
   * Return the selector for the day-notes textarea.
   * Uses the `id` attribute whose prefix is `day-notes-`.
   */
  const textareaSelector = 'textarea[id^="day-notes-"]'

  it('textarea is visible on the day view', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    const textarea = await page.$(textareaSelector)
    expect(textarea).not.toBeNull()
  })

  it('typing updates the textarea value', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    await page.click(textareaSelector)
    await page.type(textareaSelector, 'hello day notes')

    const value = await page.$eval(textareaSelector, (el) => (el as HTMLTextAreaElement).value)
    expect(value).toBe('hello day notes')
  })

  it('notes persist across client-side navigation', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    await page.click(textareaSelector)
    await page.type(textareaSelector, 'persist test')

    // Wait for the debounced save to flush (400ms component + 500ms idb)
    await new Promise((r) => setTimeout(r, 1200))

    // Navigate away to week view
    await navigateTo(page, `/week/${getCurrentWeekStr()}`)

    // Navigate back to day view
    await navigateTo(page, '/')

    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    const value = await page.$eval(textareaSelector, (el) => (el as HTMLTextAreaElement).value)
    expect(value).toBe('persist test')
  })

  it('notes persist after full page reload', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    await page.click(textareaSelector)
    await page.type(textareaSelector, 'reload test')

    // Wait for debounced save + idb flush
    await new Promise((r) => setTimeout(r, 1200))

    // Full page reload
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })

    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    const value = await page.$eval(textareaSelector, (el) => (el as HTMLTextAreaElement).value)
    expect(value).toBe('reload test')
  })

  it('placeholder is shown when notes are empty', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    const placeholder = await page.$eval(textareaSelector, (el) => (el as HTMLTextAreaElement).placeholder)
    expect(placeholder.length).toBeGreaterThan(0)
  })

  it('notes are scoped to the current day', async () => {
    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    await page.click(textareaSelector)
    await page.type(textareaSelector, 'today only')

    // Wait for save
    await new Promise((r) => setTimeout(r, 1200))

    // Navigate to yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)
    await navigateTo(page, `/day/${yStr}`)

    await page.waitForSelector(textareaSelector, { timeout: 5000 })
    const value = await page.$eval(textareaSelector, (el) => (el as HTMLTextAreaElement).value)
    expect(value).toBe('')
  })
})
