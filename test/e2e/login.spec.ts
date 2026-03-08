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

const dbPath = path.join(os.tmpdir(), `tend-login-test-${Date.now()}.db`)

describe('Login', () => {
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
    })

    afterEach(async () => {
        await page.close()
    })

    it('redirects unauthenticated user to /login', async () => {
        // Trigger a client-side navigation to a protected route
        await page.evaluate(() => {
            const el = document.querySelector('#__nuxt') as any // eslint-disable-line
            const router = el?.__vue_app__?.config?.globalProperties?.$router
            if (router) router.push('/day')
        })
        // Auth middleware should redirect back to /login
        await page.waitForFunction(
            () => window.location.pathname === '/login',
            undefined,
            { timeout: 5000 },
        )
        expect(page.url()).toContain('/login')
    })

    it('renders login form', async () => {
        const heading = await page.$('form.login-form h1')
        expect(await heading!.textContent()).toContain('Tend')
        expect(await page.$('form.login-form input[type="text"]')).toBeTruthy()
        expect(await page.$('form.login-form input[type="password"]')).toBeTruthy()
        expect(await page.$('form.login-form button[type="submit"]')).toBeTruthy()
    })

    it('logs in with correct credentials and redirects to home', async () => {
        await page.fill('form.login-form input[type="text"]', 'admin')
        await page.fill('form.login-form input[type="password"]', 'password123')
        await page.click('form.login-form button[type="submit"]')

        await page.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 5000 })
        expect(page.url()).not.toContain('/login')
    })

    it('shows error on wrong credentials', async () => {
        await page.fill('form.login-form input[type="text"]', 'admin')
        await page.fill('form.login-form input[type="password"]', 'wrongpassword')
        await page.click('form.login-form button[type="submit"]')

        await page.waitForSelector('[role="alert"]', { timeout: 5000 })
        const error = await page.$('[role="alert"]')
        expect(error).toBeTruthy()
        expect(page.url()).toContain('/login')
    })

    it('shows rate-limit warning after too many failed attempts', async () => {
        // Exhaust the rate limit (5 attempts) from the browser context
        // so the server sees the same IP as the UI submission
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: 'wrong' }),
                })
            }
        })

        // The 6th attempt through the UI should show the rate-limit message
        await page.fill('form.login-form input[type="text"]', 'admin')
        await page.fill('form.login-form input[type="password"]', 'wrong')
        await page.click('form.login-form button[type="submit"]')

        await page.waitForSelector('[role="alert"].error', { timeout: 5000 })
        const alertText = await page.$eval('[role="alert"].error', el => el.textContent ?? '')
        expect(alertText).toContain('Too many login attempts')
    })
})
