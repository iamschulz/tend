import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startServer, stopServer, getBaseUrl } from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-serverless-pw-test-${Date.now()}.db`)

describe('Password APIs in serverless mode', () => {
    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'serverless',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
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
    })

    afterAll(() => {
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    it('POST /api/auth/change-password is not accessible', async () => {
        const res = await fetch(`${getBaseUrl()}/api/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: 'test', newPassword: 'newtest123' }),
        })
        expect(res.status).toBe(401)
    })

    it('PUT /api/admin/users/:id rejects password reset', async () => {
        const res = await fetch(`${getBaseUrl()}/api/admin/users/some-id`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'newpassword1' }),
        })
        expect(res.status).toBe(403)
    })
})
