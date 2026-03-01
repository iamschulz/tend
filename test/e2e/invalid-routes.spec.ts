import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { Page } from 'playwright'
import { startServer, stopServer, launchBrowser, closeBrowser, getPage } from './_setup'

/** Assert the page shows the error notice and NOT the future message. */
async function expectErrorNotice(page: Page) {
  const errorNotice = await page.$('.error')
  expect(errorNotice).not.toBeNull()

  const hasFutureMessage = await page.evaluate(() => {
    const paragraphs = document.querySelectorAll('#__nuxt p')
    return Array.from(paragraphs).some((p) => p.textContent?.includes('awesome'))
  })
  expect(hasFutureMessage).toBe(false)
}

describe('Invalid date routes show error instead of future message', () => {
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

  it('shows error for invalid day route', async () => {
    page = await getPage('/day/x-02-28')
    await expectErrorNotice(page)
  })

  it('shows error for invalid week route', async () => {
    page = await getPage('/week/x-W01')
    await expectErrorNotice(page)
  })

  it('shows error for invalid month route', async () => {
    page = await getPage('/month/x-02')
    await expectErrorNotice(page)
  })
})
