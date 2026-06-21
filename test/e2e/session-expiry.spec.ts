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
import { addCategory, waitForIdbKeyContains, waitForIdbKeyCleared } from './_helpers'

const dbPath = path.join(os.tmpdir(), `tend-session-expiry-test-${Date.now()}.db`)

describe('Session expiry', () => {
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
        // Log in
        await page.fill('form.login-form input[type="text"]', 'admin')
        await page.fill('form.login-form input[type="password"]', 'password123')
        await page.click('form.login-form button[type="submit"]')
        await page.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 5000 })
        // Wait for server hydration loading screen to clear
        await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
    })

    afterEach(async () => {
        await page.close()
    })

    it('wipes persisted data when the session has expired', async () => {
        await addCategory(page, 'ExpireTest')

        // The category is persisted to IndexedDB while logged in
        await waitForIdbKeyContains(page, 'tend-categories', 'ExpireTest')

        // Simulate server-side session expiry: drop the session cookie without
        // running the explicit logout flow, then reload to re-init auth state.
        await page.context().clearCookies()
        await page.reload({ waitUntil: 'networkidle' })

        // The middleware sees no active session and redirects to /login...
        await page.waitForFunction(
            () => window.location.pathname === '/login',
            undefined,
            { timeout: 10_000 },
        )

        // ...the trigger group is not rendered there...
        expect(await page.$$('[data-avatar] button')).toHaveLength(0)
        // ...and the stale data has been wiped from IndexedDB so it cannot be restored.
        await waitForIdbKeyCleared(page, 'tend-categories')
    })
})
