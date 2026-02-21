import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
} from './_setup'
import { openMenu } from './_helpers'

describe('Locale', () => {
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

  it('html element has lang attribute matching the default locale', async () => {
    const lang = await page.$eval('html', (el) => el.getAttribute('lang'))
    expect(lang).toBe('en')
  })

  it('html lang attribute updates when switching locale', async () => {
    await openMenu(page)

    // Open the Settings details section
    const summaries = await page.$$('dialog.menu details summary')
    await summaries[2].click()
    await page.waitForSelector('#language-select', { timeout: 3000 })

    await page.selectOption('#language-select', 'de')
    await page.waitForFunction(
      () => document.documentElement.lang === 'de',
      { timeout: 5000 },
    )

    const lang = await page.$eval('html', (el) => el.getAttribute('lang'))
    expect(lang).toBe('de')

    // Verify translated text appears in the UI
    const settingsText = await page.$eval('dialog.menu details:nth-of-type(3) summary h3', (el) => el.textContent?.trim())
    expect(settingsText).toBe('Einstellungen')
  })

  it('locale persists after page reload', async () => {
    await openMenu(page)

    // Open the Settings details section and switch to German
    const summaries = await page.$$('dialog.menu details summary')
    await summaries[2].click()
    await page.waitForSelector('#language-select', { timeout: 3000 })
    await page.selectOption('#language-select', 'de')
    await page.waitForFunction(
      () => document.documentElement.lang === 'de',
      { timeout: 5000 },
    )

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })

    const lang = await page.$eval('html', (el) => el.getAttribute('lang'))
    expect(lang).toBe('de')

    // Verify translated text is still rendered
    await openMenu(page)
    const settingsText = await page.$eval('dialog.menu details:nth-of-type(3) summary h3', (el) => el.textContent?.trim())
    expect(settingsText).toBe('Einstellungen')
  })
})
