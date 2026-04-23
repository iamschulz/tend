import * as crypto from 'node:crypto'
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
    getBaseUrl,
    navigateTo,
} from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-multi-user-nav-test-${Date.now()}.db`)

/** Login via the API and return the session cookie string. */
async function apiLogin(username: string, password: string): Promise<string> {
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        redirect: 'manual',
    })
    if (!res.ok) throw new Error(`Login failed: ${res.status}`)
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
}

/** Register a password-based account via the API and return the session cookie. */
async function apiRegister(email: string, name: string, password: string): Promise<string> {
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
        redirect: 'manual',
    })
    if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`)
    return res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
}

/** Authenticated fetch helper. */
function apiFetch(cookie: string, urlPath: string, opts?: RequestInit) {
    return fetch(`${getBaseUrl()}${urlPath}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', Cookie: cookie, ...opts?.headers },
    })
}

/** Log in as a given user through the browser UI, arriving on the home page. */
async function browserLogin(page: Page, username: string, password: string): Promise<void> {
    await page.fill('form.login-form input[type="text"]', username)
    await page.fill('form.login-form input[type="password"]', password)
    await page.click('form.login-form button[type="submit"]')
    await page.waitForFunction(() => window.location.pathname === '/', undefined, { timeout: 5000 })
    await page.waitForFunction(() => !document.querySelector('[data-loading]'), undefined, { timeout: 10_000 })
}

describe('Multi-User navigation', () => {
    let userACookie: string
    let userACatId: string
    let userAEntryId: string
    let page: Page

    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: await bcrypt.hash('passwordA123', 4),
            NUXT_DB_PATH: dbPath,
            NUXT_OAUTH_GOOGLE_CLIENT_ID: '',
            NUXT_OAUTH_GOOGLE_CLIENT_SECRET: '',
            NUXT_OAUTH_APPLE_CLIENT_ID: '',
            NUXT_OAUTH_APPLE_PRIVATE_KEY: '',
            NUXT_OAUTH_GITHUB_CLIENT_ID: '',
            NUXT_OAUTH_GITHUB_CLIENT_SECRET: '',
            NUXT_OAUTH_OIDC_CLIENT_ID: '',
            NUXT_OAUTH_OIDC_CLIENT_SECRET: '',
            NUXT_OAUTH_OIDC_OPENID_CONFIG: '',
        })
        await launchBrowser()

        // User A (admin) creates a category and an entry via the API
        userACookie = await apiLogin('admin', 'passwordA123')

        userACatId = crypto.randomUUID()
        const catRes = await apiFetch(userACookie, '/api/categories', {
            method: 'POST',
            body: JSON.stringify({
                id: userACatId,
                title: 'User A Secret Category',
                activity: { title: 'Testing', icon: 'test', emoji: '' },
                color: '#ff0000',
                goals: [],
                hidden: false,
                comment: 'Only user A should see this',
            }),
        })
        expect(catRes.status).toBe(201)

        userAEntryId = crypto.randomUUID()
        const entryRes = await apiFetch(userACookie, '/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                id: userAEntryId,
                categoryId: userACatId,
                start: Date.now() - 60_000,
                end: Date.now(),
                running: false,
                comment: 'User A private entry',
            }),
        })
        expect(entryRes.status).toBe(201)

        // Admin invites and registers User B
        const inviteRes = await apiFetch(userACookie, '/api/admin/invites', {
            method: 'POST',
            body: JSON.stringify({ email: 'userb@example.com' }),
        })
        expect(inviteRes.status).toBe(201)
        await apiRegister('userb@example.com', 'User B', 'passwordB123')
    })

    afterAll(async () => {
        await closeBrowser()
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    beforeEach(async () => {
        page = await getPage('/login')
        await browserLogin(page, 'userb@example.com', 'passwordB123')
    })

    afterEach(async () => {
        await page.close()
    })

    it('shows ErrorNotice when user B navigates to user A category URL', async () => {
        await navigateTo(page, `/category/${userACatId}`)

        // The category page relies on data in the Pinia store, populated from
        // GET /api/categories — user A's row is filtered out server-side, so
        // `category` is null and the page renders ErrorNotice.
        expect(await page.$('.category')).toBeNull()
        expect(await page.$('section.error')).not.toBeNull()

        const bodyText = await page.evaluate(() => document.body.textContent ?? '')
        expect(bodyText).not.toContain('User A Secret Category')
        expect(bodyText).not.toContain('Only user A should see this')
    })

    it('shows ErrorNotice when user B navigates to user A entry URL', async () => {
        await navigateTo(page, `/entry/${userAEntryId}`)

        expect(await page.$('section.error')).not.toBeNull()

        const bodyText = await page.evaluate(() => document.body.textContent ?? '')
        expect(bodyText).not.toContain('User A Secret Category')
        expect(bodyText).not.toContain('User A private entry')
    })

    it('user B cannot read user A data via API from the browser session', async () => {
        // Same session cookie the browser is using — confirms the UI has no
        // privileged back-channel either.
        const statuses = await page.evaluate(async (ids: { catId: string; entryId: string }) => {
            const [catList, entryList, catUpdate, entryUpdate, catDelete, entryDelete, entryStop] = await Promise.all([
                fetch('/api/categories').then(r => r.json()),
                fetch('/api/entries').then(r => r.json()),
                fetch(`/api/categories/${ids.catId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Hacked' }),
                }).then(r => r.status),
                fetch(`/api/entries/${ids.entryId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: ids.entryId, comment: 'Hacked' }),
                }).then(r => r.status),
                fetch(`/api/categories/${ids.catId}`, { method: 'DELETE' }).then(r => r.status),
                fetch(`/api/entries/${ids.entryId}`, { method: 'DELETE' }).then(r => r.status),
                fetch(`/api/entries/${ids.entryId}/stop`, { method: 'POST' }).then(r => r.status),
            ])
            return {
                catListIds: (catList as Array<{ id: string }>).map(c => c.id),
                entryListIds: (entryList as Array<{ id: string }>).map(e => e.id),
                catUpdate, entryUpdate, catDelete, entryDelete, entryStop,
            }
        }, { catId: userACatId, entryId: userAEntryId })

        expect(statuses.catListIds).not.toContain(userACatId)
        expect(statuses.entryListIds).not.toContain(userAEntryId)
        expect(statuses.catUpdate).toBe(404)
        expect(statuses.entryUpdate).toBe(404)
        expect(statuses.catDelete).toBe(404)
        expect(statuses.entryDelete).toBe(404)
        expect(statuses.entryStop).toBe(404)

        // Verify user A's data is still intact
        const catRes = await apiFetch(userACookie, '/api/categories')
        const cats = await catRes.json() as Array<{ id: string; title: string }>
        const userACat = cats.find(c => c.id === userACatId)
        expect(userACat?.title).toBe('User A Secret Category')

        const entryRes = await apiFetch(userACookie, '/api/entries')
        const entries = await entryRes.json() as Array<{ id: string; comment: string }>
        const userAEntry = entries.find(e => e.id === userAEntryId)
        expect(userAEntry?.comment).toBe('User A private entry')
    })
})
