import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
} from './_setup'
import { addCategory, holdTrigger, waitForAnnouncement, getAnnouncement } from './_helpers'

describe('Entries', () => {
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

  it('quick-click logs an instant entry', async () => {
    await addCategory(page, 'Quick Task')

    // Quick click: a normal click is fast enough (< 800ms threshold)
    const triggerBtn = await page.$('[data-avatar] button')
    expect(triggerBtn).not.toBeNull()
    await triggerBtn!.click()

    // Wait for entry to appear
    await page.waitForSelector('article.track', { timeout: 5000 })

    const entries = await page.$$('article.track')
    expect(entries.length).toBe(1)

    // Should NOT have a running indicator (play icon)
    const runningIcon = await page.$('article.track .running-icon')
    expect(runningIcon).toBeNull()

    // Announcer should mention the category
    await waitForAnnouncement(page, 'Quick Task')
    const announcement = await getAnnouncement(page)
    expect(announcement).toContain('Quick Task')
  })

  it('hold starts a running timer', async () => {
    await addCategory(page, 'Timed Task')

    await holdTrigger(page)

    // Wait for entry to appear
    await page.waitForSelector('article.track', { timeout: 5000 })

    // Should have a running indicator
    const runningIcon = await page.$('article.track .running-icon')
    expect(runningIcon).not.toBeNull()

    // Announcer should mention the category
    await waitForAnnouncement(page, 'Timed Task')
    const announcement = await getAnnouncement(page)
    expect(announcement).toContain('Timed Task')
  })

  it('stops a running entry', async () => {
    await addCategory(page, 'Stop Test')

    await holdTrigger(page)
    await page.waitForSelector('article.track', { timeout: 5000 })

    // Click the stop button (inside .controls when running)
    await page.waitForSelector('article.track .controls button', { timeout: 3000 })
    await page.click('article.track .controls button')

    // Running indicator should disappear
    await page.waitForFunction(
      () => !document.querySelector('article.track .running-icon'),
      { timeout: 5000 },
    )

    const runningIcon = await page.$('article.track .running-icon')
    expect(runningIcon).toBeNull()

    // Announcer should mention stop
    await waitForAnnouncement(page, 'Stop')
    const announcement = await getAnnouncement(page)
    expect(announcement).toContain('Stop')
    expect(announcement).toContain('Stop Test')
  })

  it('deletes a completed entry', async () => {
    await addCategory(page, 'Delete Test')

    // Quick click to create instant entry
    const triggerBtn = await page.$('[data-avatar] button')
    await triggerBtn!.click()

    await page.waitForSelector('article.track', { timeout: 5000 })

    // Click delete button (for non-running entry)
    await page.click('article.track .controls button')

    // Confirm dialog should appear
    await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })

    // Click confirm
    await page.click('dialog.confirm-dialog button[data-variant="primary"]')

    // Wait for entry to be removed
    await page.waitForFunction(
      () => !document.querySelector('article.track'),
      { timeout: 5000 },
    )

    const entries = await page.$$('article.track')
    expect(entries.length).toBe(0)

    // Announcer should mention delete
    await waitForAnnouncement(page, 'Delete')
    const announcement = await getAnnouncement(page)
    expect(announcement).toContain('Delete')
    expect(announcement).toContain('Delete Test')
  })

  it('trigger button shows running state', async () => {
    await addCategory(page, 'Running State')

    await holdTrigger(page)

    // Wait for the trigger button to become the "running" variant
    await page.waitForSelector('[data-avatar] button.running', { timeout: 5000 })

    const runningBtn = await page.$('[data-avatar] button.running')
    expect(runningBtn).not.toBeNull()
  })

  it('clicking running trigger button stops timer', async () => {
    await addCategory(page, 'Click Stop')

    await holdTrigger(page)

    // Wait for running button
    await page.waitForSelector('[data-avatar] button.running', { timeout: 5000 })

    // Click the running trigger button to stop
    await page.click('[data-avatar] button.running')

    // Running state should disappear from trigger button
    await page.waitForFunction(
      () => !document.querySelector('[data-avatar] button.running'),
      { timeout: 5000 },
    )

    const runningBtn = await page.$('[data-avatar] button.running')
    expect(runningBtn).toBeNull()

    // Running icon in entry should also disappear
    const runningIcon = await page.$('article.track .running-icon')
    expect(runningIcon).toBeNull()
  })
})
