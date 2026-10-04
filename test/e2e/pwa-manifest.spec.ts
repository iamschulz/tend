import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
  startServer,
  stopServer,
  launchBrowser,
  closeBrowser,
  getPage,
} from './_setup'

type Shortcut = { name: string; url: string }

/**
 * Writes raw idb-keyval entries so the service worker's manifest generator has
 * data to read. Values are the JSON strings pinia-plugin-persistedstate would
 * store (e.g. `{"categories":[...]}`), or a plain locale string.
 * @param page - Playwright page instance
 * @param data - Map of idb-keyval key to stored value
 */
async function seedIdb(page: Page, data: Record<string, string>): Promise<void> {
  await page.evaluate((pairs: [string, string][]) => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('keyval-store')
    open.addEventListener('upgradeneeded', () => open.result.createObjectStore('keyval'))
    open.addEventListener('error', () => reject(open.error))
    open.addEventListener('success', () => {
      const tx = open.result.transaction('keyval', 'readwrite')
      const store = tx.objectStore('keyval')
      for (const [k, v] of pairs) store.put(v, k)
      tx.addEventListener('complete', () => resolve())
      tx.addEventListener('error', () => reject(tx.error))
    })
  }), Object.entries(data))
}

/**
 * Fetches the manifest through the (controlling) service worker and returns its
 * shortcuts — i.e. the dynamically generated ones, not the static file.
 * @param page - Playwright page instance
 */
async function fetchShortcuts(page: Page): Promise<Shortcut[]> {
  return page.evaluate(() =>
    fetch('/manifest.webmanifest', { cache: 'no-store' })
      .then((r) => r.json())
      .then((m: { shortcuts?: Shortcut[] }) => m.shortcuts ?? []),
  )
}

// Serialize categories/entries the way persistedstate stores them.
const cats = (categories: unknown[]) => JSON.stringify({ categories })
const ents = (entries: unknown[]) => JSON.stringify({ entries })

describe('PWA dynamic manifest shortcuts', () => {
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
    // The manifest is generated in the SW's fetch handler, so it must be controlling.
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 10_000 })
  })

  afterEach(async () => {
    await page.close()
  })

  it('omits Today, localizes Search, excludes hidden categories', async () => {
    await seedIdb(page, {
      'tend-locale': 'de',
      'tend-categories': cats([
        { id: 'v1', title: 'Visible', hidden: false, activity: { emoji: '🔥' } },
        { id: 'h1', title: 'Secret', hidden: true },
      ]),
      'tend-entries': ents([]),
    })

    const shortcuts = await fetchShortcuts(page)

    // No shortcut points at the start_url ("Today" was removed).
    expect(shortcuts.some((s) => s.url === '/')).toBe(false)
    // Search is first and localized to the stored locale.
    expect(shortcuts[0]).toEqual({ name: 'Suche', url: '/search' })
    // Visible category is included (with its emoji); hidden one is not.
    expect(shortcuts).toContainEqual({ name: '🔥 Visible', url: '/?start=v1' })
    expect(shortcuts.some((s) => s.url === '/?start=h1')).toBe(false)
  })

  it('orders categories by last used and caps them at four', async () => {
    await seedIdb(page, {
      'tend-locale': 'en',
      'tend-categories': cats(
        ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id.toUpperCase(), hidden: false })),
      ),
      // Ascending start times → 'e' is most recent, 'a' the oldest.
      'tend-entries': ents([
        { categoryId: 'a', start: 100 },
        { categoryId: 'b', start: 200 },
        { categoryId: 'c', start: 300 },
        { categoryId: 'd', start: 400 },
        { categoryId: 'e', start: 500 },
      ]),
    })

    const categoryUrls = (await fetchShortcuts(page))
      .filter((s) => s.url.startsWith('/?start='))
      .map((s) => s.url)

    // Most-recently-used first, oldest ('a') dropped by the cap of four.
    expect(categoryUrls).toEqual(['/?start=e', '/?start=d', '/?start=c', '/?start=b'])
  })

  it('keeps never-used categories after used ones, in original order', async () => {
    await seedIdb(page, {
      'tend-locale': 'en',
      'tend-categories': cats([
        { id: 'x', title: 'X', hidden: false },
        { id: 'y', title: 'Y', hidden: false },
        { id: 'z', title: 'Z', hidden: false },
      ]),
      'tend-entries': ents([{ categoryId: 'y', start: 500 }]),
    })

    const categoryUrls = (await fetchShortcuts(page))
      .filter((s) => s.url.startsWith('/?start='))
      .map((s) => s.url)

    // 'y' used → first; 'x' and 'z' unused → keep their original order.
    expect(categoryUrls).toEqual(['/?start=y', '/?start=x', '/?start=z'])
  })
})
