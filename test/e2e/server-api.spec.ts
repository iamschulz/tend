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
            expect(body.user.username).toBe('admin')
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
