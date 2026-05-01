import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import bcrypt from 'bcryptjs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startServer, stopServer, getBaseUrl } from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-multi-user-api-attack-test-${Date.now()}.db`)

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

/** Fetch helper that authenticates via either a session cookie or a Bearer token. */
function authedFetch(auth: { cookie?: string; token?: string }, urlPath: string, opts?: RequestInit) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts?.headers as Record<string, string> ?? {}) }
    if (auth.cookie) headers.Cookie = auth.cookie
    if (auth.token) headers.Authorization = `Bearer ${auth.token}`
    return fetch(`${getBaseUrl()}${urlPath}`, { ...opts, headers })
}

describe('Multi-User API attack', () => {
    let userACookie: string
    let userBCookie: string
    let userBToken: string
    let userACatId: string
    let userAClosedEntryId: string
    let userARunningEntryId: string
    const userADate = '2026-03-15'
    const userANote = 'User A private daily note — should never leak'

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

        // User A (admin) seeds a category, a closed entry, a running entry, and a daily note.
        userACookie = await apiLogin('admin', 'passwordA123')

        userACatId = crypto.randomUUID()
        const catRes = await authedFetch({ cookie: userACookie }, '/api/categories', {
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

        userAClosedEntryId = crypto.randomUUID()
        const closedRes = await authedFetch({ cookie: userACookie }, '/api/entries', {
            method: 'POST',
            body: JSON.stringify({
                id: userAClosedEntryId,
                categoryId: userACatId,
                start: new Date(`${userADate}T10:00:00Z`).getTime(),
                end: new Date(`${userADate}T10:30:00Z`).getTime(),
                running: false,
                comment: 'User A closed entry',
            }),
        })
        expect(closedRes.status).toBe(201)

        const startRes = await authedFetch({ cookie: userACookie }, '/api/entries/start', {
            method: 'POST',
            body: JSON.stringify({ categoryId: userACatId, comment: 'User A running timer' }),
        })
        expect(startRes.status).toBe(201)
        userARunningEntryId = (await startRes.json() as { id: string }).id

        const dayRes = await authedFetch({ cookie: userACookie }, `/api/days/${userADate}`, {
            method: 'PUT',
            body: JSON.stringify({ notes: userANote }),
        })
        expect(dayRes.status).toBe(200)

        // Invite and register User B.
        const inviteRes = await authedFetch({ cookie: userACookie }, '/api/admin/invites', {
            method: 'POST',
            body: JSON.stringify({ email: 'userb@example.com' }),
        })
        expect(inviteRes.status).toBe(201)
        userBCookie = await apiRegister('userb@example.com', 'User B', 'passwordB123')

        // Also mint a Bearer token for User B to confirm the token auth path is equally isolated.
        const tokenRes = await authedFetch({ cookie: userBCookie }, '/api/auth/tokens', {
            method: 'POST',
            body: JSON.stringify({ label: 'userb-script' }),
        })
        expect(tokenRes.status).toBe(201)
        userBToken = (await tokenRes.json() as { token: string }).token
    })

    afterAll(() => {
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    // -- Read attempts -----------------------------------------------------

    describe('read attempts', () => {
        it('GET /api/categories does not list user A category', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/categories')
            expect(res.status).toBe(200)
            const cats = await res.json() as Array<{ id: string }>
            expect(cats.find(c => c.id === userACatId)).toBeUndefined()
        })

        it('GET /api/entries does not list user A entries (unfiltered)', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/entries')
            expect(res.status).toBe(200)
            const entries = await res.json() as Array<{ id: string }>
            const ids = entries.map(e => e.id)
            expect(ids).not.toContain(userAClosedEntryId)
            expect(ids).not.toContain(userARunningEntryId)
        })

        it('GET /api/entries does not list user A entries (date range containing them)', async () => {
            // Range covers userA's closed entry and any running timer created today.
            for (const range of ['day', 'week', 'month', 'year'] as const) {
                const res = await authedFetch({ cookie: userBCookie }, `/api/entries?range=${range}&date=${userADate}`)
                expect(res.status).toBe(200)
                const entries = await res.json() as Array<{ id: string }>
                const ids = entries.map(e => e.id)
                expect(ids, `range=${range}`).not.toContain(userAClosedEntryId)
            }

            // A range around "now" should also not include user A's running entry.
            const today = new Date().toISOString().slice(0, 10)
            const res = await authedFetch({ cookie: userBCookie }, `/api/entries?range=day&date=${today}`)
            const entries = await res.json() as Array<{ id: string }>
            expect(entries.map(e => e.id)).not.toContain(userARunningEntryId)
        })

        it('GET /api/days/:date returns empty stub on user A date (no note leak)', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/days/${userADate}`)
            expect(res.status).toBe(200)
            const body = await res.json() as { date: string; notes: string }
            expect(body.notes).toBe('')
            expect(body.notes).not.toContain('User A private')
        })

        it('GET /api/days?q= does not surface user A notes', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/days?q=private')
            expect(res.status).toBe(200)
            const results = await res.json() as Array<{ notes: string }>
            expect(results.every(r => !r.notes.includes('User A private'))).toBe(true)
        })

        it('GET /api/data/export contains no user A data', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/data/export')
            expect(res.status).toBe(200)
            const payload = JSON.stringify(await res.json())
            expect(payload).not.toContain(userACatId)
            expect(payload).not.toContain(userAClosedEntryId)
            expect(payload).not.toContain(userARunningEntryId)
            expect(payload).not.toContain('User A Secret Category')
            expect(payload).not.toContain('User A closed entry')
            expect(payload).not.toContain('User A private')
        })
    })

    // -- Mutation attempts (session cookie) --------------------------------

    describe('mutation attempts via session cookie', () => {
        it('PUT /api/categories/:id returns 404', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/categories/${userACatId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: 'Hacked' }),
            })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/categories/:id returns 404', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/categories/${userACatId}`, {
                method: 'DELETE',
            })
            expect(res.status).toBe(404)
        })

        it('PUT /api/entries/:id returns 404 for closed entry', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/entries/${userAClosedEntryId}`, {
                method: 'PUT',
                body: JSON.stringify({ id: userAClosedEntryId, comment: 'Hacked' }),
            })
            expect(res.status).toBe(404)
        })

        it('PUT /api/entries/:id returns 404 for running entry', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/entries/${userARunningEntryId}`, {
                method: 'PUT',
                body: JSON.stringify({ id: userARunningEntryId, comment: 'Hacked' }),
            })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/entries/:id returns 404', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/entries/${userAClosedEntryId}`, {
                method: 'DELETE',
            })
            expect(res.status).toBe(404)
        })

        it('POST /api/entries/:id/stop returns 404 for foreign running timer', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/entries/${userARunningEntryId}/stop`, {
                method: 'POST',
            })
            expect(res.status).toBe(404)
        })

        it('POST /api/entries with foreign categoryId returns 404', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/entries', {
                method: 'POST',
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    categoryId: userACatId,
                    start: Date.now() - 60_000,
                    end: Date.now(),
                    running: false,
                    comment: 'Injected by B',
                }),
            })
            expect(res.status).toBe(404)
        })

        it('POST /api/entries/start with foreign categoryId returns 404', async () => {
            const res = await authedFetch({ cookie: userBCookie }, '/api/entries/start', {
                method: 'POST',
                body: JSON.stringify({ categoryId: userACatId, comment: 'Injected' }),
            })
            expect(res.status).toBe(404)
        })

        it('PUT /api/entries/:id to re-parent onto foreign category returns 404', async () => {
            // Create a legit entry owned by user B, then try to re-parent it onto
            // user A's category — this shouldn't succeed even though the entry itself is user B's.
            const bCatId = crypto.randomUUID()
            await authedFetch({ cookie: userBCookie }, '/api/categories', {
                method: 'POST',
                body: JSON.stringify({
                    id: bCatId,
                    title: 'B Category',
                    activity: { title: 'B', icon: 'b', emoji: '' },
                    color: '#00ff00',
                    goals: [],
                    hidden: false,
                    comment: '',
                }),
            })
            const bEntryId = crypto.randomUUID()
            await authedFetch({ cookie: userBCookie }, '/api/entries', {
                method: 'POST',
                body: JSON.stringify({
                    id: bEntryId,
                    categoryId: bCatId,
                    start: Date.now() - 60_000,
                    end: Date.now(),
                    running: false,
                    comment: 'B entry',
                }),
            })

            const res = await authedFetch({ cookie: userBCookie }, `/api/entries/${bEntryId}`, {
                method: 'PUT',
                body: JSON.stringify({ id: bEntryId, categoryId: userACatId }),
            })
            expect(res.status).toBe(404)
        })

        it('PUT /api/days/:date on user A date does not overwrite user A note', async () => {
            const res = await authedFetch({ cookie: userBCookie }, `/api/days/${userADate}`, {
                method: 'PUT',
                body: JSON.stringify({ notes: 'User B note for the same day' }),
            })
            expect(res.status).toBe(200)

            // User A's note should be intact
            const aRes = await authedFetch({ cookie: userACookie }, `/api/days/${userADate}`)
            const aBody = await aRes.json() as { notes: string }
            expect(aBody.notes).toBe(userANote)
        })
    })

    // -- Same attacks via Bearer token -------------------------------------

    describe('attacks via Bearer token', () => {
        it('GET /api/categories via token does not list user A category', async () => {
            const res = await authedFetch({ token: userBToken }, '/api/categories')
            expect(res.status).toBe(200)
            const cats = await res.json() as Array<{ id: string }>
            expect(cats.find(c => c.id === userACatId)).toBeUndefined()
        })

        it('GET /api/entries via token does not list user A entries', async () => {
            const res = await authedFetch({ token: userBToken }, '/api/entries')
            expect(res.status).toBe(200)
            const entries = await res.json() as Array<{ id: string }>
            const ids = entries.map(e => e.id)
            expect(ids).not.toContain(userAClosedEntryId)
            expect(ids).not.toContain(userARunningEntryId)
        })

        it('PUT /api/categories/:id via token returns 404', async () => {
            const res = await authedFetch({ token: userBToken }, `/api/categories/${userACatId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: 'Hacked via token' }),
            })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/entries/:id via token returns 404', async () => {
            const res = await authedFetch({ token: userBToken }, `/api/entries/${userAClosedEntryId}`, {
                method: 'DELETE',
            })
            expect(res.status).toBe(404)
        })

        it('POST /api/entries/:id/stop via token returns 404', async () => {
            const res = await authedFetch({ token: userBToken }, `/api/entries/${userARunningEntryId}/stop`, {
                method: 'POST',
            })
            expect(res.status).toBe(404)
        })

        it('GET /api/data/export via token contains no user A data', async () => {
            const res = await authedFetch({ token: userBToken }, '/api/data/export')
            expect(res.status).toBe(200)
            const payload = JSON.stringify(await res.json())
            expect(payload).not.toContain(userACatId)
            expect(payload).not.toContain('User A Secret Category')
        })
    })

    // -- User A data still intact ------------------------------------------

    it('user A data is intact after all attack attempts', async () => {
        const catRes = await authedFetch({ cookie: userACookie }, '/api/categories')
        const cats = await catRes.json() as Array<{ id: string; title: string }>
        const aCat = cats.find(c => c.id === userACatId)
        expect(aCat?.title).toBe('User A Secret Category')

        const entryRes = await authedFetch({ cookie: userACookie }, '/api/entries')
        const entries = await entryRes.json() as Array<{ id: string; comment: string; running: boolean }>
        const closed = entries.find(e => e.id === userAClosedEntryId)
        const running = entries.find(e => e.id === userARunningEntryId)
        expect(closed?.comment).toBe('User A closed entry')
        expect(running?.running).toBe(true)

        const dayRes = await authedFetch({ cookie: userACookie }, `/api/days/${userADate}`)
        const day = await dayRes.json() as { notes: string }
        expect(day.notes).toBe(userANote)
    })
})
