import { getSessionVersion } from '~~/server/utils/sessionVersion'
import { users, apiTokens } from '~~/server/database/schema'
import { hashApiToken } from '~~/server/utils/apiToken'
import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const publicRoutes = [
    '/api/auth/login',
    '/api/auth/session',
    '/api/_auth/session',
    '/api/auth/google',
    '/api/auth/apple',
    '/api/auth/github',
    '/api/auth/oidc',
    '/api/auth/register',
    '/api/auth/providers',
]

/**
 * Authenticates a request via Bearer token.
 * Hashes the provided token, looks it up in the database, validates expiry,
 * and populates the event context with the owning user's ID and role.
 * Updates `last_used_at` on successful authentication.
 * @param event - The H3 event
 * @param token - The plaintext Bearer token from the Authorization header
 * @returns `true` if authentication succeeded, `false` if the token is invalid
 */
async function authenticateWithToken(event: H3Event, token: string): Promise<boolean> {
    const db = useDb()
    const hash = hashApiToken(token)

    const row = db
        .select({
            tokenHash: apiTokens.tokenHash,
            userId: apiTokens.userId,
            expiresAt: apiTokens.expiresAt,
            id: apiTokens.id,
        })
        .from(apiTokens)
        .where(eq(apiTokens.tokenHash, hash))
        .get()

    if (!row) return false

    // Constant-time comparison of the hash to prevent timing side-channels
    const hashBuffer = Buffer.from(hash, 'hex')
    const rowHashBuffer = Buffer.from(row.tokenHash, 'hex')
    if (!timingSafeEqual(hashBuffer, rowHashBuffer)) return false

    // Check expiry
    if (row.expiresAt && row.expiresAt < Date.now()) return false

    // Verify the user still exists
    const user = db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, row.userId))
        .get()
    if (!user) return false

    // Update last_used_at
    db.update(apiTokens)
        .set({ lastUsedAt: Date.now() })
        .where(eq(apiTokens.id, row.id))
        .run()

    event.context.userId = user.id
    event.context.userRole = user.role
    return true
}

/**
 * Server auth middleware — guards all /api/ routes except public ones.
 * Supports two authentication methods:
 * 1. Bearer token via `Authorization: Bearer <token>` header (for external clients)
 * 2. Session cookie (for the browser frontend)
 * If a Bearer token is present, session cookies are not checked.
 */
export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const path = getRequestURL(event).pathname

    if (config.public.backendMode !== 'server') {
        if (path.startsWith('/api/admin/')) {
            throw createError({ statusCode: 403, statusMessage: 'Admin routes are disabled in serverless mode' })
        }
        return
    }

    if (!path.startsWith('/api/') || publicRoutes.includes(path)) {
        return
    }

    // Bearer tokens are checked first so that external API clients (scripts,
    // mobile apps, integrations) get a fast auth path without touching the
    // session/cookie machinery. If no Bearer header is present, we fall back
    // to session cookies for the browser frontend — the two mechanisms coexist
    // because OAuth redirect flows require cookies, while programmatic clients
    // need stateless token auth.
    const authorization = getHeader(event, 'authorization')
    if (authorization?.startsWith('Bearer ')) {
        const token = authorization.slice(7)
        const authenticated = await authenticateWithToken(event, token)
        if (!authenticated) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid or expired API token' })
        }
        return
    }

    // Fall back to session cookie authentication
    await requireUserSession(event)

    const session = await getUserSession(event)
    if (session.sessionVersion !== getSessionVersion()) {
        await clearUserSession(event)
        throw createError({ statusCode: 401, message: 'Session expired' })
    }

    if (session.user) {
        // Verify the user still exists (e.g. not deleted by an admin)
        const user = useDb().select({ id: users.id }).from(users).where(eq(users.id, session.user.id)).get()
        if (!user) {
            await clearUserSession(event)
            throw createError({ statusCode: 401, message: 'Session expired' })
        }

        event.context.userId = session.user.id
        event.context.userRole = session.user.role
    }
})
