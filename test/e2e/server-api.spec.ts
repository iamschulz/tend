import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import bcrypt from 'bcryptjs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startServer, stopServer, getBaseUrl } from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-server-api-test-${Date.now()}.db`)

/** Login and return the session cookie string. */
async function login(): Promise<string> {
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' }),
        redirect: 'manual',
    })
    const setCookie = res.headers.getSetCookie()
    return setCookie.map(c => c.split(';')[0]).join('; ')
}

/** Authenticated fetch helper. */
function apiFetch(cookie: string, urlPath: string, opts?: RequestInit) {
    return fetch(`${getBaseUrl()}${urlPath}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', Cookie: cookie, ...opts?.headers },
    })
}

function makeCategory(overrides?: Record<string, unknown>) {
    return {
        id: crypto.randomUUID(),
        title: 'Test Category',
        activity: { title: 'Testing', icon: 'test', emoji: '' },
        color: '#ff0000',
        goals: [],
        hidden: false,
        comment: '',
        ...overrides,
    }
}

function makeEntry(categoryId: string, overrides?: Record<string, unknown>) {
    return {
        id: crypto.randomUUID(),
        categoryId,
        start: Date.now() - 60_000,
        end: null,
        running: true,
        comment: '',
        ...overrides,
    }
}

describe('Server API', () => {
    let cookie: string

    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: await bcrypt.hash('password123', 4),
            NUXT_DB_PATH: dbPath,
        })
        cookie = await login()
    })

    afterAll(() => {
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    // -- Auth ---------------------------------------------------------------

    describe('auth', () => {
        it('GET /api/auth/session returns logged-in state', async () => {
            const res = await apiFetch(cookie, '/api/auth/session')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.loggedIn).toBe(true)
            expect(body.user.name).toBe('admin')
        })

        it('rejects unauthenticated API requests', async () => {
            const res = await fetch(`${getBaseUrl()}/api/categories`)
            expect(res.status).toBe(401)
        })

        it('POST /api/auth/revoke invalidates all sessions', async () => {
            // Login to get a separate session
            const otherCookie = await login()

            // Revoke all sessions
            const revokeRes = await apiFetch(otherCookie, '/api/auth/revoke', { method: 'POST' })
            expect(revokeRes.status).toBe(200)

            // The revoked session can no longer access protected routes
            const res = await apiFetch(otherCookie, '/api/categories')
            expect(res.status).toBe(401)

            // Re-login for the main cookie so subsequent tests still work
            cookie = await login()
        })
    })

    // -- Categories ---------------------------------------------------------

    describe('categories', () => {
        it('POST /api/categories creates a category', async () => {
            const cat = makeCategory()
            const res = await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.id).toBe(cat.id)
            expect(body.title).toBe('Test Category')
            expect(body.activity.title).toBe('Testing')
            expect(body.color).toBe('#ff0000')
        })

        it('GET /api/categories returns all categories', async () => {
            const res = await apiFetch(cookie, '/api/categories')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(Array.isArray(body)).toBe(true)
            expect(body.length).toBeGreaterThanOrEqual(1)
            expect(body[0]).toHaveProperty('id')
            expect(body[0]).toHaveProperty('activity')
        })

        it('PUT /api/categories/:id updates a category', async () => {
            const cat = makeCategory()
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })

            const res = await apiFetch(cookie, `/api/categories/${cat.id}`, {
                method: 'PUT',
                body: JSON.stringify({ title: 'Updated Title', color: '#00ff00' }),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.title).toBe('Updated Title')
            expect(body.color).toBe('#00ff00')
            expect(body.activity.title).toBe('Testing') // unchanged field preserved
        })

        it('PUT /api/categories/:id returns 404 for missing category', async () => {
            const res = await apiFetch(cookie, `/api/categories/${crypto.randomUUID()}`, {
                method: 'PUT',
                body: JSON.stringify({ title: 'Nope' }),
            })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/categories/:id deletes a category', async () => {
            const cat = makeCategory()
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })

            const res = await apiFetch(cookie, `/api/categories/${cat.id}`, { method: 'DELETE' })
            expect(res.status).toBe(200)

            // Verify it's gone
            const listRes = await apiFetch(cookie, '/api/categories')
            const categories = await listRes.json()
            expect(categories.find((c: { id: string }) => c.id === cat.id)).toBeUndefined()
        })

        it('DELETE /api/categories/:id returns 404 for missing category', async () => {
            const res = await apiFetch(cookie, `/api/categories/${crypto.randomUUID()}`, { method: 'DELETE' })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/categories/:id cascades to entries', async () => {
            const cat = makeCategory()
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })
            const entry = makeEntry(cat.id)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })

            await apiFetch(cookie, `/api/categories/${cat.id}`, { method: 'DELETE' })

            const entriesRes = await apiFetch(cookie, '/api/entries')
            const entries = await entriesRes.json()
            expect(entries.find((e: { id: string }) => e.id === entry.id)).toBeUndefined()
        })
    })

    // -- Entries -------------------------------------------------------------

    describe('entries', () => {
        let categoryId: string

        beforeAll(async () => {
            const cat = makeCategory()
            categoryId = cat.id
            const res = await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })
            expect(res.status, 'entries: category setup').toBe(200)
        })

        it('POST /api/entries creates an entry', async () => {
            const entry = makeEntry(categoryId)
            const res = await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.id).toBe(entry.id)
            expect(body.categoryId).toBe(categoryId)
            expect(body.running).toBe(true)
            expect(body.end).toBeNull()
        })

        it('GET /api/entries returns all entries', async () => {
            const res = await apiFetch(cookie, '/api/entries')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(Array.isArray(body)).toBe(true)
            expect(body.length).toBeGreaterThanOrEqual(1)
        })

        it('PUT /api/entries/:id stops a running entry', async () => {
            const entry = makeEntry(categoryId)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })

            const now = Date.now()
            const res = await apiFetch(cookie, `/api/entries/${entry.id}`, {
                method: 'PUT',
                body: JSON.stringify({ id: entry.id, end: now, running: false }),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.running).toBe(false)
            expect(body.end).toBe(now)

            // Verify persistence via GET
            const listRes = await apiFetch(cookie, '/api/entries')
            const entries = await listRes.json()
            const persisted = entries.find((e: { id: string }) => e.id === entry.id)
            expect(persisted.running).toBe(false)
            expect(persisted.end).toBe(now)
        })

        it('PUT /api/entries/:id updates comment', async () => {
            const entry = makeEntry(categoryId)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })

            const res = await apiFetch(cookie, `/api/entries/${entry.id}`, {
                method: 'PUT',
                body: JSON.stringify({ id: entry.id, comment: 'updated comment' }),
            })
            expect(res.status).toBe(200)
            expect((await res.json()).comment).toBe('updated comment')
        })

        it('PUT /api/entries/:id returns 404 for missing entry', async () => {
            const missingId = crypto.randomUUID()
            const res = await apiFetch(cookie, `/api/entries/${missingId}`, {
                method: 'PUT',
                body: JSON.stringify({ id: missingId, running: false }),
            })
            expect(res.status).toBe(404)
        })

        it('DELETE /api/entries/:id deletes an entry', async () => {
            const entry = makeEntry(categoryId)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })

            const res = await apiFetch(cookie, `/api/entries/${entry.id}`, { method: 'DELETE' })
            expect(res.status).toBe(200)

            const listRes = await apiFetch(cookie, '/api/entries')
            const entries = await listRes.json()
            expect(entries.find((e: { id: string }) => e.id === entry.id)).toBeUndefined()
        })

        it('DELETE /api/entries/:id returns 404 for missing entry', async () => {
            const res = await apiFetch(cookie, `/api/entries/${crypto.randomUUID()}`, { method: 'DELETE' })
            expect(res.status).toBe(404)
        })
    })

    // -- API Tokens ---------------------------------------------------------

    describe('api tokens', () => {
        it('POST /api/auth/tokens creates a token', async () => {
            const res = await apiFetch(cookie, '/api/auth/tokens', {
                method: 'POST',
                body: JSON.stringify({ label: 'Test token' }),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body).toHaveProperty('token')
            expect(body.token.length).toBeGreaterThan(0)
            expect(body.label).toBe('Test token')
            expect(body).toHaveProperty('id')
            expect(body).toHaveProperty('createdAt')
        })

        it('GET /api/auth/tokens lists tokens without hashes', async () => {
            const res = await apiFetch(cookie, '/api/auth/tokens')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(Array.isArray(body)).toBe(true)
            expect(body.length).toBeGreaterThanOrEqual(1)
            expect(body[0]).toHaveProperty('label')
            expect(body[0]).not.toHaveProperty('tokenHash')
            expect(body[0]).not.toHaveProperty('token')
        })

        it('Bearer token authenticates API requests', async () => {
            const createRes = await apiFetch(cookie, '/api/auth/tokens', {
                method: 'POST',
                body: JSON.stringify({ label: 'Bearer test' }),
            })
            const { token } = await createRes.json()

            const res = await fetch(`${getBaseUrl()}/api/categories`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(200)
        })

        it('invalid Bearer token returns 401', async () => {
            const res = await fetch(`${getBaseUrl()}/api/categories`, {
                headers: { Authorization: 'Bearer invalid-token-value' },
            })
            expect(res.status).toBe(401)
        })

        it('expired Bearer token returns 401', async () => {
            const createRes = await apiFetch(cookie, '/api/auth/tokens', {
                method: 'POST',
                body: JSON.stringify({ label: 'Expired', expiresAt: Date.now() + 1000 }),
            })
            const { token } = await createRes.json()

            // Wait for token to expire
            await new Promise(r => setTimeout(r, 1500))

            const res = await fetch(`${getBaseUrl()}/api/categories`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(401)
        })

        it('DELETE /api/auth/tokens/:id revokes a token', async () => {
            const createRes = await apiFetch(cookie, '/api/auth/tokens', {
                method: 'POST',
                body: JSON.stringify({ label: 'To revoke' }),
            })
            const { id, token } = await createRes.json()

            // Revoke the token
            const delRes = await apiFetch(cookie, `/api/auth/tokens/${id}`, { method: 'DELETE' })
            expect(delRes.status).toBe(200)

            // Revoked token no longer works
            const res = await fetch(`${getBaseUrl()}/api/categories`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(401)
        })

        it('DELETE /api/auth/tokens/:id returns 404 for missing token', async () => {
            const res = await apiFetch(cookie, `/api/auth/tokens/${crypto.randomUUID()}`, { method: 'DELETE' })
            expect(res.status).toBe(404)
        })

        it('last_used_at is updated on token use', async () => {
            const createRes = await apiFetch(cookie, '/api/auth/tokens', {
                method: 'POST',
                body: JSON.stringify({ label: 'Usage tracking' }),
            })
            const { id, token } = await createRes.json()

            // Use the token
            await fetch(`${getBaseUrl()}/api/categories`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            // Check last_used_at is set
            const listRes = await apiFetch(cookie, '/api/auth/tokens')
            const tokens = await listRes.json()
            const found = tokens.find((t: { id: string }) => t.id === id)
            expect(found.lastUsedAt).toBeTypeOf('number')
            expect(found.lastUsedAt).toBeGreaterThan(0)
        })
    })

    // -- Entry date-range filtering -----------------------------------------

    describe('entry date-range filtering', () => {
        let rangeTestCategoryId: string

        beforeAll(async () => {
            const cat = makeCategory({ title: 'Range Test' })
            rangeTestCategoryId = cat.id
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })

            // Create entries on specific UTC dates
            // Entry on 2025-06-15 (finished)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(makeEntry(rangeTestCategoryId, {
                    start: Date.UTC(2025, 5, 15, 10, 0, 0),
                    end: Date.UTC(2025, 5, 15, 11, 0, 0),
                    running: false,
                    comment: 'june-15',
                })),
            })

            // Entry on 2025-06-16 (finished)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(makeEntry(rangeTestCategoryId, {
                    start: Date.UTC(2025, 5, 16, 14, 0, 0),
                    end: Date.UTC(2025, 5, 16, 15, 0, 0),
                    running: false,
                    comment: 'june-16',
                })),
            })

            // Entry on 2025-07-01 (different month)
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(makeEntry(rangeTestCategoryId, {
                    start: Date.UTC(2025, 6, 1, 8, 0, 0),
                    end: Date.UTC(2025, 6, 1, 9, 0, 0),
                    running: false,
                    comment: 'july-01',
                })),
            })

            // Running entry (no end) started on 2025-06-15
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(makeEntry(rangeTestCategoryId, {
                    start: Date.UTC(2025, 5, 15, 20, 0, 0),
                    end: null,
                    running: true,
                    comment: 'running-june-15',
                })),
            })
        })

        it('filters entries by day', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=day&date=2025-06-15')
            expect(res.status).toBe(200)
            const body = await res.json()
            const comments = body.map((e: { comment: string }) => e.comment)
            expect(comments).toContain('june-15')
            expect(comments).toContain('running-june-15')
            expect(comments).not.toContain('june-16')
            expect(comments).not.toContain('july-01')
        })

        it('filters entries by month', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=month&date=2025-06-01')
            expect(res.status).toBe(200)
            const body = await res.json()
            const comments = body.map((e: { comment: string }) => e.comment)
            expect(comments).toContain('june-15')
            expect(comments).toContain('june-16')
            expect(comments).toContain('running-june-15')
            expect(comments).not.toContain('july-01')
        })

        it('filters entries by year', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=year&date=2025-01-01')
            expect(res.status).toBe(200)
            const body = await res.json()
            const comments = body.map((e: { comment: string }) => e.comment)
            expect(comments).toContain('june-15')
            expect(comments).toContain('july-01')
        })

        it('includes running entries (end is null) in range', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=day&date=2025-06-15')
            const body = await res.json()
            const running = body.find((e: { comment: string }) => e.comment === 'running-june-15')
            expect(running).toBeDefined()
            expect(running.end).toBeNull()
            expect(running.running).toBe(true)
        })

        it('returns empty array for day with no entries', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=day&date=2020-01-01')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body).toHaveLength(0)
        })

        it('returns all entries when no range params given', async () => {
            const res = await apiFetch(cookie, '/api/entries')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.length).toBeGreaterThanOrEqual(4)
        })

        it('rejects invalid date format', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=day&date=not-a-date')
            expect(res.status).toBeGreaterThanOrEqual(400)
        })

        it('rejects range without date', async () => {
            const res = await apiFetch(cookie, '/api/entries?range=day')
            expect(res.status).toBeGreaterThanOrEqual(400)
        })

        it('rejects date without range', async () => {
            const res = await apiFetch(cookie, '/api/entries?date=2025-06-15')
            expect(res.status).toBeGreaterThanOrEqual(400)
        })
    })

    // -- Start/Stop timer endpoints -----------------------------------------

    describe('start/stop timer', () => {
        let timerCategoryId: string
        let timerCategory2Id: string

        beforeAll(async () => {
            const cat = makeCategory({ title: 'Timer Test' })
            timerCategoryId = cat.id
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })

            const cat2 = makeCategory({ title: 'Timer Test 2' })
            timerCategory2Id = cat2.id
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat2),
            })
        })

        it('POST /api/entries/start creates a running entry', async () => {
            const before = Date.now()
            const res = await apiFetch(cookie, '/api/entries/start', {
                method: 'POST',
                body: JSON.stringify({ categoryId: timerCategoryId }),
            })
            const after = Date.now()

            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.running).toBe(true)
            expect(body.end).toBeNull()
            expect(body.categoryId).toBe(timerCategoryId)
            expect(body.start).toBeGreaterThanOrEqual(before)
            expect(body.start).toBeLessThanOrEqual(after)
            expect(body.comment).toBe('')
        })

        it('POST /api/entries/start with comment', async () => {
            // Use category 2 to avoid conflict
            const res = await apiFetch(cookie, '/api/entries/start', {
                method: 'POST',
                body: JSON.stringify({ categoryId: timerCategory2Id, comment: 'test note' }),
            })
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.comment).toBe('test note')
        })

        it('POST /api/entries/start returns 409 if same category already running', async () => {
            // timerCategoryId already has a running entry from first test
            const res = await apiFetch(cookie, '/api/entries/start', {
                method: 'POST',
                body: JSON.stringify({ categoryId: timerCategoryId }),
            })
            expect(res.status).toBe(409)
        })

        it('POST /api/entries/start returns 404 for invalid category', async () => {
            const res = await apiFetch(cookie, '/api/entries/start', {
                method: 'POST',
                body: JSON.stringify({ categoryId: crypto.randomUUID() }),
            })
            expect(res.status).toBe(404)
        })

        it('POST /api/entries/:id/stop stops a running entry', async () => {
            // Find the running entry for timerCategoryId
            const listRes = await apiFetch(cookie, '/api/entries')
            const entries = await listRes.json()
            const running = entries.find((e: { categoryId: string, running: boolean }) =>
                e.categoryId === timerCategoryId && e.running,
            )
            expect(running).toBeDefined()

            const before = Date.now()
            const res = await apiFetch(cookie, `/api/entries/${running.id}/stop`, { method: 'POST' })
            const after = Date.now()

            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.running).toBe(false)
            expect(body.end).toBeGreaterThanOrEqual(before)
            expect(body.end).toBeLessThanOrEqual(after)
        })

        it('POST /api/entries/:id/stop returns 409 if entry is not running', async () => {
            // The entry we just stopped
            const listRes = await apiFetch(cookie, '/api/entries')
            const entries = await listRes.json()
            const stopped = entries.find((e: { categoryId: string, running: boolean }) =>
                e.categoryId === timerCategoryId && !e.running,
            )
            expect(stopped).toBeDefined()

            const res = await apiFetch(cookie, `/api/entries/${stopped.id}/stop`, { method: 'POST' })
            expect(res.status).toBe(409)
        })

        it('POST /api/entries/:id/stop returns 404 for missing entry', async () => {
            const res = await apiFetch(cookie, `/api/entries/${crypto.randomUUID()}/stop`, { method: 'POST' })
            expect(res.status).toBe(404)
        })
    })

    // -- Data import/export -------------------------------------------------

    describe('data import/export', () => {
        it('GET /api/data/export returns all data', async () => {
            // Seed a category with an entry
            const cat = makeCategory()
            await apiFetch(cookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(cat),
            })
            const entry = makeEntry(cat.id, { running: false, end: Date.now() })
            await apiFetch(cookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })

            const res = await apiFetch(cookie, '/api/data/export')
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body).toHaveProperty('categories')
            expect(Array.isArray(body.categories)).toBe(true)

            const exported = body.categories.find((c: { id: string }) => c.id === cat.id)
            expect(exported).toBeDefined()
            expect(exported.entries.length).toBeGreaterThanOrEqual(1)
            expect(exported.entries.find((e: { id: string }) => e.id === entry.id)).toBeDefined()
        })

        it('POST /api/data/import replaces all data', async () => {
            const catId = crypto.randomUUID()
            const entryId = crypto.randomUUID()
            const importData = {
                categories: [{
                    id: catId,
                    title: 'Imported',
                    activity: { title: 'Importing', icon: 'import', emoji: '' },
                    color: '#0000ff',
                    goals: [],
                    hidden: false,
                    comment: '',
                    entries: [{
                        id: entryId,
                        categoryId: catId,
                        start: Date.now() - 120_000,
                        end: Date.now() - 60_000,
                        running: false,
                        comment: 'imported entry',
                    }],
                }],
            }

            const res = await apiFetch(cookie, '/api/data/import', {
                method: 'POST',
                body: JSON.stringify(importData),
            })
            expect(res.status).toBe(200)

            // All previous data should be replaced
            const catRes = await apiFetch(cookie, '/api/categories')
            const categories = await catRes.json()
            expect(categories).toHaveLength(1)
            expect(categories[0].id).toBe(catId)
            expect(categories[0].title).toBe('Imported')

            const entryRes = await apiFetch(cookie, '/api/entries')
            const entries = await entryRes.json()
            expect(entries).toHaveLength(1)
            expect(entries[0].id).toBe(entryId)
            expect(entries[0].comment).toBe('imported entry')
        })
    })
})
