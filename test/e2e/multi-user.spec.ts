import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import bcrypt from 'bcryptjs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startServer, stopServer, getBaseUrl } from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-multi-user-test-${Date.now()}.db`)

/** Login with username/password and return the session cookie string. */
async function login(username: string, password: string): Promise<string> {
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        redirect: 'manual',
    })
    if (!res.ok) throw new Error(`Login failed: ${res.status}`)
    const setCookie = res.headers.getSetCookie()
    return setCookie.map(c => c.split(';')[0]).join('; ')
}

/** Register a new password-based account and return the session cookie string. */
async function register(email: string, name: string, password: string): Promise<string> {
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
        redirect: 'manual',
    })
    if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`)
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

describe('Multi-User', () => {
    let adminCookie: string

    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: await bcrypt.hash('password123', 4),
            NUXT_DB_PATH: dbPath,
        })
        adminCookie = await login('admin', 'password123')
    })

    afterAll(() => {
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    // -- Providers endpoint ------------------------------------------------

    describe('providers', () => {
        it('GET /api/auth/providers returns available auth methods', async () => {
            const res = await fetch(`${getBaseUrl()}/api/auth/providers`)
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.password).toBe(true)
            expect(body.google).toBe(false)
            expect(body.apple).toBe(false)
            expect(body.github).toBe(false)
            expect(body.oidc).toBe(false)
        })

        it('is accessible without authentication', async () => {
            const res = await fetch(`${getBaseUrl()}/api/auth/providers`)
            expect(res.status).toBe(200)
        })
    })

    // -- Registration ------------------------------------------------------

    describe('registration', () => {
        it('rejects registration without allowlist entry', async () => {
            const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'stranger@example.com', name: 'Stranger', password: 'longpassword' }),
            })
            expect(res.status).toBe(403)
        })

        it('allows registration after admin adds email to allowlist', async () => {
            // Admin adds email
            const inviteRes = await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'friend@example.com' }),
            })
            expect(inviteRes.status).toBe(200)

            // User registers
            const cookie = await register('friend@example.com', 'Friend', 'password456')
            expect(cookie).toBeTruthy()

            // Session is valid
            const sessionRes = await apiFetch(cookie, '/api/auth/session')
            const session = await sessionRes.json()
            expect(session.loggedIn).toBe(true)
            expect(session.user.email).toBe('friend@example.com')
            expect(session.user.role).toBe('user')
        })

        it('rejects duplicate email registration', async () => {
            const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'friend@example.com', name: 'Duplicate', password: 'password789' }),
            })
            expect(res.status).toBe(409)
        })

        it('rejects registration with short password', async () => {
            // Add to allowlist first
            await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'short@example.com' }),
            })

            const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'short@example.com', name: 'Short', password: 'abc' }),
            })
            expect(res.status).toBe(400)
        })

        it('removes email from allowlist after registration', async () => {
            const invitesRes = await apiFetch(adminCookie, '/api/admin/invites')
            const invites = await invitesRes.json()
            const friendInvite = invites.find((i: { email: string }) => i.email === 'friend@example.com')
            expect(friendInvite).toBeUndefined()
        })
    })

    // -- Data isolation ----------------------------------------------------

    describe('data isolation', () => {
        let userCookie: string
        let adminCatId: string
        let userCatId: string

        beforeAll(async () => {
            // Add and register a second user
            await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'isolated@example.com' }),
            })
            userCookie = await register('isolated@example.com', 'Isolated User', 'password789')

            // Admin creates a category
            const adminCat = makeCategory({ title: 'Admin Category' })
            adminCatId = adminCat.id
            await apiFetch(adminCookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(adminCat),
            })

            // User creates a category
            const userCat = makeCategory({ title: 'User Category' })
            userCatId = userCat.id
            await apiFetch(userCookie, '/api/categories', {
                method: 'POST',
                body: JSON.stringify(userCat),
            })
        })

        it('user cannot see admin categories', async () => {
            const res = await apiFetch(userCookie, '/api/categories')
            const cats = await res.json()
            expect(cats.find((c: { id: string }) => c.id === adminCatId)).toBeUndefined()
        })

        it('admin cannot see user categories', async () => {
            const res = await apiFetch(adminCookie, '/api/categories')
            const cats = await res.json()
            expect(cats.find((c: { id: string }) => c.id === userCatId)).toBeUndefined()
        })

        it('user cannot update admin category', async () => {
            const res = await apiFetch(userCookie, `/api/categories/${adminCatId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: 'Hacked' }),
            })
            expect(res.status).toBe(404)
        })

        it('user cannot delete admin category', async () => {
            const res = await apiFetch(userCookie, `/api/categories/${adminCatId}`, { method: 'DELETE' })
            expect(res.status).toBe(404)
        })

        it('entries are isolated between users', async () => {
            const adminEntry = makeEntry(adminCatId)
            await apiFetch(adminCookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(adminEntry),
            })

            const userEntries = await apiFetch(userCookie, '/api/entries')
            const entries = await userEntries.json()
            expect(entries.find((e: { id: string }) => e.id === adminEntry.id)).toBeUndefined()
        })

        it('user cannot create entry for admin category', async () => {
            const entry = makeEntry(adminCatId)
            const res = await apiFetch(userCookie, '/api/entries', {
                method: 'POST',
                body: JSON.stringify(entry),
            })
            expect(res.status).toBe(404)
        })

        it('export only returns own data', async () => {
            const adminExport = await apiFetch(adminCookie, '/api/data/export')
            const adminData = await adminExport.json()
            const adminCatIds = adminData.categories.map((c: { id: string }) => c.id)
            expect(adminCatIds).toContain(adminCatId)
            expect(adminCatIds).not.toContain(userCatId)

            const userExport = await apiFetch(userCookie, '/api/data/export')
            const userData = await userExport.json()
            const userCatIds = userData.categories.map((c: { id: string }) => c.id)
            expect(userCatIds).toContain(userCatId)
            expect(userCatIds).not.toContain(adminCatId)
        })

        it('import only replaces own data', async () => {
            const newCatId = crypto.randomUUID()
            await apiFetch(userCookie, '/api/data/import', {
                method: 'POST',
                body: JSON.stringify({
                    categories: [{
                        id: newCatId,
                        title: 'Imported',
                        activity: { title: 'Importing', icon: 'import', emoji: '' },
                        color: '#0000ff',
                        goals: [],
                        hidden: false,
                        comment: '',
                        entries: [],
                    }],
                }),
            })

            // User data replaced
            const userCats = await apiFetch(userCookie, '/api/categories')
            const userCategories = await userCats.json()
            expect(userCategories).toHaveLength(1)
            expect(userCategories[0].id).toBe(newCatId)

            // Admin data untouched
            const adminCats = await apiFetch(adminCookie, '/api/categories')
            const adminCategories = await adminCats.json()
            expect(adminCategories.find((c: { id: string }) => c.id === adminCatId)).toBeDefined()
        })
    })

    // -- Admin API ---------------------------------------------------------

    describe('admin API', () => {
        it('GET /api/admin/users lists all users', async () => {
            const res = await apiFetch(adminCookie, '/api/admin/users')
            expect(res.status).toBe(200)
            const users = await res.json()
            expect(users.length).toBeGreaterThanOrEqual(2)
            expect(users[0]).toHaveProperty('id')
            expect(users[0]).toHaveProperty('email')
            expect(users[0]).toHaveProperty('role')
            // Should not expose password hash
            expect(users[0]).not.toHaveProperty('passwordHash')
            expect(users[0]).not.toHaveProperty('password_hash')
        })

        it('rejects non-admin access to admin routes', async () => {
            // Register a regular user
            await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'nonadmin@example.com' }),
            })
            const userCookie = await register('nonadmin@example.com', 'Regular', 'password123')

            const res = await apiFetch(userCookie, '/api/admin/users')
            expect(res.status).toBe(403)
        })

        it('PUT /api/admin/users/:id changes role', async () => {
            const usersRes = await apiFetch(adminCookie, '/api/admin/users')
            const users = await usersRes.json()
            const regularUser = users.find((u: { role: string }) => u.role === 'user')

            const res = await apiFetch(adminCookie, `/api/admin/users/${regularUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: 'admin' }),
            })
            expect(res.status).toBe(200)
            const updated = await res.json()
            expect(updated.role).toBe('admin')

            // Revert
            await apiFetch(adminCookie, `/api/admin/users/${regularUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: 'user' }),
            })
        })

        it('prevents removing the last admin', async () => {
            // Find the admin user
            const usersRes = await apiFetch(adminCookie, '/api/admin/users')
            const users = await usersRes.json()

            // Demote all other admins first
            const admins = users.filter((u: { role: string }) => u.role === 'admin')
            for (const admin of admins.slice(1)) {
                await apiFetch(adminCookie, `/api/admin/users/${admin.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ role: 'user' }),
                })
            }

            // Try to demote the last admin
            const lastAdmin = users.find((u: { role: string }) => u.role === 'admin')
            const res = await apiFetch(adminCookie, `/api/admin/users/${lastAdmin.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: 'user' }),
            })
            expect(res.status).toBe(400)
        })

        it('prevents deleting the last admin', async () => {
            const usersRes = await apiFetch(adminCookie, '/api/admin/users')
            const users = await usersRes.json()
            const admins = users.filter((u: { role: string }) => u.role === 'admin')

            // Make sure there's only one admin
            expect(admins.length).toBe(1)

            const res = await apiFetch(adminCookie, `/api/admin/users/${admins[0].id}`, { method: 'DELETE' })
            expect(res.status).toBe(400)
        })

        it('DELETE /api/admin/users/:id deletes a user', async () => {
            // Find a non-admin user to delete
            const usersRes = await apiFetch(adminCookie, '/api/admin/users')
            const users = await usersRes.json()
            const victim = users.find((u: { role: string; email: string }) => u.role === 'user' && u.email === 'nonadmin@example.com')

            const res = await apiFetch(adminCookie, `/api/admin/users/${victim.id}`, { method: 'DELETE' })
            expect(res.status).toBe(200)

            // Verify removed
            const afterRes = await apiFetch(adminCookie, '/api/admin/users')
            const after = await afterRes.json()
            expect(after.find((u: { id: string }) => u.id === victim.id)).toBeUndefined()
        })
    })

    // -- Invite management -------------------------------------------------

    describe('invite management', () => {
        it('POST /api/admin/invites adds an email', async () => {
            const res = await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'newinvite@example.com' }),
            })
            expect(res.status).toBe(200)
            const invite = await res.json()
            expect(invite.email).toBe('newinvite@example.com')
            expect(invite).toHaveProperty('id')
        })

        it('rejects duplicate invite', async () => {
            const res = await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'newinvite@example.com' }),
            })
            expect(res.status).toBe(409)
        })

        it('GET /api/admin/invites lists invites', async () => {
            const res = await apiFetch(adminCookie, '/api/admin/invites')
            expect(res.status).toBe(200)
            const invites = await res.json()
            expect(invites.find((i: { email: string }) => i.email === 'newinvite@example.com')).toBeDefined()
        })

        it('DELETE /api/admin/invites/:id removes an invite', async () => {
            const listRes = await apiFetch(adminCookie, '/api/admin/invites')
            const invites = await listRes.json()
            const invite = invites.find((i: { email: string }) => i.email === 'newinvite@example.com')

            const res = await apiFetch(adminCookie, `/api/admin/invites/${invite.id}`, { method: 'DELETE' })
            expect(res.status).toBe(200)

            const afterRes = await apiFetch(adminCookie, '/api/admin/invites')
            const after = await afterRes.json()
            expect(after.find((i: { email: string }) => i.email === 'newinvite@example.com')).toBeUndefined()
        })
    })

    // -- Revoke restricted to admin ----------------------------------------

    describe('revoke', () => {
        it('rejects non-admin revoke', async () => {
            await apiFetch(adminCookie, '/api/admin/invites', {
                method: 'POST',
                body: JSON.stringify({ email: 'revoke-test@example.com' }),
            })
            const userCookie = await register('revoke-test@example.com', 'Revoker', 'password123')

            const res = await apiFetch(userCookie, '/api/auth/revoke', { method: 'POST' })
            expect(res.status).toBe(403)
        })
    })
})
