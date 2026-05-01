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
    navigateTo,
} from './_setup'
import { waitForToast } from './_helpers'

const dbPath = path.join(os.tmpdir(), `tend-connectivity-test-${Date.now()}.db`)

/** Log in via the UI and arrive on the home page. */
async function browserLogin(page: Page): Promise<void> {
    await page.fill('form.login-form input[type="text"]', 'admin')
    await page.fill('form.login-form input[type="password"]', 'password123')
    await page.click('form.login-form button[type="submit"]')
    await page.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
}

describe('Connectivity toasts', () => {
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

    it('shows the "you are offline" toast when navigator.onLine is false during navigation', async () => {
        // Take the device offline AFTER login so the session/hydration on /
        // succeeds normally. The middleware on the next nav sees navigator.onLine=false.
        await page.context().setOffline(true)

        await navigateTo(page, '/day')

        const text = await waitForToast(page)
        expect(text.toLowerCase()).toContain('offline')
    })

    it('shows the "server unreachable" toast when /api/health fails but the device is online', async () => {
        // Block only the health probe — leaves navigator.onLine=true and the
        // rest of the app reachable, isolating the "server is down" path.
        await page.route('**/api/health', route => route.abort())

        await navigateTo(page, '/day')

        const text = await waitForToast(page)
        expect(text.toLowerCase()).toContain('server unreachable')
    })
})
