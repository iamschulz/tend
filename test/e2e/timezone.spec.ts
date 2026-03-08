import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
  navigateTo,
} from './_setup'
import { addCategory } from './_helpers'

describe('Timezone handling', () => {
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

  it('day view uses local date boundaries, not UTC', async () => {
    // Auckland is UTC+12 (NZST) in June.
    // An entry at June 14 13:00 UTC = June 15 01:00 NZST.
    // The entry's LOCAL date is June 15, but its UTC date is June 14.
    // With the old UTC bug, the entry would appear on June 14 instead of June 15.
    page = await getPage('/', { timezoneId: 'Pacific/Auckland' })

    await addCategory(page, 'TZ Test')

    const entryTimestamp = Date.UTC(2025, 5, 14, 13, 0, 0) // June 14 13:00 UTC = June 15 01:00 NZST

    // Inject entry with the specific timestamp via Pinia store
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await page.evaluate((ts) => {
      const el = document.querySelector('#__nuxt') as any
      const pinia = el?.__vue_app__?.config?.globalProperties?.$pinia
      const state = pinia.state.value.data
      const categoryId = state.categories[0].id
      state.entries = [...state.entries, {
        id: crypto.randomUUID(),
        start: ts,
        end: ts,
        running: false,
        categoryId,
      }]
    }, entryTimestamp)
    /* eslint-enable @typescript-eslint/no-explicit-any */

    await new Promise((r) => setTimeout(r, 300))

    // Entry should appear on June 15 (its LOCAL date in Auckland)
    await navigateTo(page, '/day/2025-06-15')
    await page.waitForSelector('article.track', { timeout: 5000 })
    const entriesOnLocalDate = await page.$$('article.track')
    expect(entriesOnLocalDate.length).toBe(1)

    // Entry should NOT appear on June 14 (its UTC date)
    await navigateTo(page, '/day/2025-06-14')
    // Wait for Vue reactivity to settle
    await new Promise((r) => setTimeout(r, 500))
    const entriesOnUtcDate = await page.$$('article.track')
    expect(entriesOnUtcDate.length).toBe(0)
  })

  it('today heading uses local date, not UTC', async () => {
    // Use a negative-offset timezone: Honolulu is UTC-10.
    // At June 15 03:00 UTC, it's still June 14 17:00 in Honolulu.
    page = await getPage('/', { timezoneId: 'Pacific/Honolulu' })

    await addCategory(page, 'Hawaii Test')

    const entryTimestamp = Date.UTC(2025, 5, 15, 3, 0, 0) // June 15 03:00 UTC = June 14 17:00 HST

    /* eslint-disable @typescript-eslint/no-explicit-any */
    await page.evaluate((ts) => {
      const el = document.querySelector('#__nuxt') as any
      const pinia = el?.__vue_app__?.config?.globalProperties?.$pinia
      const state = pinia.state.value.data
      const categoryId = state.categories[0].id
      state.entries = [...state.entries, {
        id: crypto.randomUUID(),
        start: ts,
        end: ts,
        running: false,
        categoryId,
      }]
    }, entryTimestamp)
    /* eslint-enable @typescript-eslint/no-explicit-any */

    await new Promise((r) => setTimeout(r, 300))

    // Entry should appear on June 14 (its LOCAL date in Honolulu)
    await navigateTo(page, '/day/2025-06-14')
    await page.waitForSelector('article.track', { timeout: 5000 })
    const entriesOnLocalDate = await page.$$('article.track')
    expect(entriesOnLocalDate.length).toBe(1)

    // Entry should NOT appear on June 15 (its UTC date)
    await navigateTo(page, '/day/2025-06-15')
    await new Promise((r) => setTimeout(r, 500))
    const entriesOnUtcDate = await page.$$('article.track')
    expect(entriesOnUtcDate.length).toBe(0)
  })
})
