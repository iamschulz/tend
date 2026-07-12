import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import bcrypt from 'bcryptjs'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
    startServer,
    stopServer,
    launchBrowser,
    closeBrowser,
    getPage,
} from './_setup'
import { addCategory, quickClickTrigger, nudgeTimeViaSelector } from './_helpers'

const dbPath = path.join(os.tmpdir(), `tend-entry-server-test-${Date.now()}.db`)

/** Log in via the UI and arrive on the home page. */
async function browserLogin(page: Page): Promise<void> {
    await page.fill('form.login-form input[type="text"]', 'admin')
    await page.fill('form.login-form input[type="password"]', 'password123')
    await page.click('form.login-form button[type="submit"]')
    await page.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
}

/**
 * Create a quick entry via the UI and open its detail page.
 * @param page - Playwright page instance
 * @param categoryName - Category to create the entry under
 */
async function createAndOpenEntry(page: Page, categoryName: string): Promise<void> {
    await addCategory(page, categoryName)
    await quickClickTrigger(page)

    const link = await page.$('article.track a[data-card-link]')
    expect(link).not.toBeNull()
    await link!.click()
    await page.waitForFunction(
        () => window.location.pathname.startsWith('/entry/'),
        undefined,
        { timeout: 5000 },
    )
    await page.waitForSelector('[data-card] .controls input[type="datetime-local"]', { timeout: 5000 })
}

/**
 * Reload the current page and wait for the server-mode store to re-hydrate
 * from the database, proving the edit was persisted server-side.
 * @param page - Playwright page instance
 */
async function reloadAndRehydrate(page: Page): Promise<void> {
    // Give the fire-and-forget PUT time to reach the server before reloading.
    await new Promise(r => setTimeout(r, 800))
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    await page.waitForSelector('[data-card] .controls input[type="datetime-local"]', { timeout: 5000 })
}

describe('Entry detail page (server mode)', () => {
    let page: Page

    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: await bcrypt.hash('password123', 4),
            NUXT_DB_PATH: dbPath,
        })
        await launchBrowser()
    })

    afterAll(async () => {
        await closeBrowser()
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    beforeEach(async () => {
        page = await getPage('/login')
        await browserLogin(page)
    })

    afterEach(async () => {
        await page.close()
    })

    it('changing start hour and minute via the selector persists to the server', async () => {
        await createAndOpenEntry(page, 'SrvStartEdit')

        // A quick-click entry has start === end, so both inputs render; target the first.
        const startSel = '[data-card] .controls input[type="datetime-local"] >> nth=0'
        await page.fill(startSel, '2025-06-15T10:30')
        await new Promise(r => setTimeout(r, 200))

        await nudgeTimeViaSelector(page, startSel, { hour: 1, minute: 1 })
        expect(await page.locator(startSel).inputValue()).toBe('2025-06-15T11:31')

        // Full reload re-fetches entries from the DB in server mode.
        await reloadAndRehydrate(page)

        expect(await page.locator(startSel).inputValue()).toBe('2025-06-15T11:31')
    })

    it('changing stopped hour and minute via the selector persists to the server', async () => {
        await createAndOpenEntry(page, 'SrvEndEdit')

        const inputs = '[data-card] .controls input[type="datetime-local"]'
        const startSel = `${inputs} >> nth=0`
        const endSel = `${inputs} >> nth=1`

        // Move the entry into the past and give it a real duration so the end
        // input is editable (end must stay >= start).
        await page.fill(startSel, '2025-06-15T10:00')
        await new Promise(r => setTimeout(r, 200))
        await page.fill(endSel, '2025-06-15T11:00')
        await new Promise(r => setTimeout(r, 200))

        await nudgeTimeViaSelector(page, endSel, { hour: 1, minute: 1 })
        expect(await page.locator(endSel).inputValue()).toBe('2025-06-15T12:01')

        await reloadAndRehydrate(page)

        const values = await page.$$eval(inputs, els => els.map(e => (e as HTMLInputElement).value))
        expect(values).toEqual(['2025-06-15T10:00', '2025-06-15T12:01'])
    })
})
