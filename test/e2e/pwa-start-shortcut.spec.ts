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
import { addCategory } from './_helpers'

/**
 * Reads the first category's id straight from the Pinia data store.
 * @param page - Playwright page instance
 */
async function firstCategoryId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector('#__nuxt') as any // eslint-disable-line
    const store = el?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('data')
    return store?.categories?.[0]?.id as string
  })
}

/**
 * Counts running entries in the Pinia data store.
 * @param page - Playwright page instance
 */
async function runningEntryCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('#__nuxt') as any // eslint-disable-line
    const store = el?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('data')
    return (store?.entries ?? []).filter((e: { running: boolean }) => e.running).length
  })
}

/**
 * Client-side navigate via the router, preserving query strings.
 * `navigateTo` from _setup can't be used for URLs with a query because it waits
 * on `location.pathname` alone. This mounts the day view fresh, which is what
 * fires the `?start=` handler — mirroring a PWA launch from a shortcut without
 * relying on a full reload (the preview harness doesn't restore IDB on reload).
 * @param page - Playwright page instance
 * @param path - Path (may include a query) to push
 */
async function routerPush(page: Page, path: string): Promise<void> {
  await page.evaluate((p: string) => {
    const el = document.querySelector('#__nuxt') as any // eslint-disable-line
    el?.__vue_app__?.config?.globalProperties?.$router?.push(p)
  }, path)
  await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
}

describe('PWA start-timer shortcut', () => {
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
    await addCategory(page, 'Focus')
  })

  afterEach(async () => {
    await page.close()
  })

  it('starts a running timer for the category in ?start', async () => {
    const id = await firstCategoryId(page)

    // Leave and re-enter the day view via the shortcut URL so its mount handler runs.
    await navigateTo(page, '/search')
    await routerPush(page, `/?start=${id}`)

    await page.waitForSelector('[data-avatar] button.running', { timeout: 8000 })
    expect(await runningEntryCount(page)).toBe(1)
  })

  it('strips the start query so returning to the day view does not restart it', async () => {
    const id = await firstCategoryId(page)

    await navigateTo(page, '/search')
    await routerPush(page, `/?start=${id}`)
    await page.waitForSelector('[data-avatar] button.running', { timeout: 8000 })

    // The handler removes the query after acting.
    expect(await page.evaluate(() => window.location.search)).toBe('')

    // Re-mounting the (now query-less) day view must not add a second timer.
    await navigateTo(page, '/search')
    await navigateTo(page, '/')
    await new Promise((r) => setTimeout(r, 300))
    expect(await runningEntryCount(page)).toBe(1)
  })

  it('ignores an unknown category id', async () => {
    await navigateTo(page, '/search')
    await routerPush(page, '/?start=does-not-exist')

    // Give the mount handler a beat to (not) act.
    await new Promise((r) => setTimeout(r, 500))
    expect(await runningEntryCount(page)).toBe(0)
    expect(await page.$('[data-avatar] button.running')).toBeNull()
  })
})
