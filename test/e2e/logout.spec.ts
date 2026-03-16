import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
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

const dbPath = path.join(os.tmpdir(), `tend-logout-test-${Date.now()}.db`)

/**
 * Opens the Data details section in the menu, then clicks the logout button.
 * @param page - Playwright page instance
 */
async function clickLogout(page: Page): Promise<void> {
    await openMenu(page)
    // Open the Settings <details> section so the logout button becomes visible
    await page.evaluate(() => {
        const sections = document.querySelectorAll('dialog.menu details')
        const settingsSection = sections[2]
        if (settingsSection && !settingsSection.hasAttribute('open')) {
            settingsSection.querySelector('summary')?.click()
        }
    })
    const logoutButton = page.locator('dialog.menu button[data-button]', { hasText: /log\s*out|abmelden/i })
    await logoutButton.click({ timeout: 5000 })
}

describe('Logout', () => {
    let page: Page

    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: 'password123',
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

    it('logs out and redirects to login page', async () => {
        await clickLogout(page)

        await page.waitForFunction(
            () => window.location.pathname === '/login',
            undefined,
            { timeout: 5000 },
        )
        expect(page.url()).toContain('/login')
    })

    it('cannot access protected routes after logout', async () => {
        await clickLogout(page)

        await page.waitForFunction(
            () => window.location.pathname === '/login',
            undefined,
            { timeout: 5000 },
        )

        // Verify the API rejects unauthenticated requests
        const status = await page.evaluate(() =>
            fetch('/api/categories').then(r => r.status),
        )
        expect(status).toBe(401)
    })
})
