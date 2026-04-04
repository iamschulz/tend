import { z } from 'zod'
import { getRequestIP } from 'h3'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { safeCompare } from '~~/server/utils/safeCompare'
import { getSessionVersion } from '~~/server/utils/sessionVersion'
import { hashPassword, verifyPasswordHash, isBcryptHash } from '~~/server/utils/passwordHash'
import { users } from '~~/server/database/schema'

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})

// Dummy hash used to ensure constant-time rejection when no user is found,
// preventing timing-based user enumeration.
let dummyHash: string | null = null

const limiter = createRateLimiter(5, 15 * 60 * 1000)

/**
 * POST /api/auth/login — Validates credentials and creates an authenticated session.
 * Authenticates against the users table. Falls back to env-var credentials for backward compat.
 * Rate-limited to 5 failed attempts per IP per 15 minutes.
 * @param event - The H3 request event
 * @returns `{ ok: true }` on success; throws 401 on bad credentials, 429 on rate limit
 */
export default defineEventHandler(async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    if (limiter.isLimited(ip)) {
        throw createError({ statusCode: 429, message: 'Too many login attempts. Try again later.' })
    }

    const { username, password } = await readValidatedBody(event, loginSchema.parse)
    const db = useDb()

    // Lazily initialize dummy hash for constant-time rejection
    if (!dummyHash) dummyHash = await hashPassword('__dummy__')

    // Try database-backed auth first: look up by email or name
    const user = db
        .select()
        .from(users)
        .where(eq(users.email, username))
        .get()
        ?? db
            .select()
            .from(users)
            .where(eq(users.name, username))
            .get()

    if (user?.passwordHash) {
        if (!isBcryptHash(user.passwordHash)) {
            console.error('[tend] User has non-bcrypt password hash:', user.id)
            throw createError({ statusCode: 500, message: 'Internal server error' })
        }

        const validPassword = await verifyPasswordHash(password, user.passwordHash)
        if (!validPassword) {
            limiter.recordFailure(ip)
            throw createError({ statusCode: 401, message: 'Invalid credentials' })
        }

        limiter.clear(ip)

        db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, user.id)).run()

        await setUserSession(event, {
            user: { id: user.id, email: user.email, name: user.name, role: user.role as 'admin' | 'user' },
            sessionVersion: getSessionVersion(),
        })

        return { ok: true }
    }

    // Fallback: env-var credentials (backward compat for migration period)
    const config = useRuntimeConfig()
    if (!config.adminUsername || !config.adminPassword) {
        // Run bcrypt against dummy hash to prevent timing-based user enumeration
        await verifyPasswordHash(password, dummyHash)
        limiter.recordFailure(ip)
        throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    if (!isBcryptHash(config.adminPassword)) {
        console.error('[tend] NUXT_ADMIN_PASSWORD is not a bcrypt hash')
        throw createError({ statusCode: 500, message: 'Internal server error' })
    }

    const validUsername = safeCompare(username, config.adminUsername)
    const validPassword = await verifyPasswordHash(password, config.adminPassword)
    if (!validUsername || !validPassword) {
        limiter.recordFailure(ip)
        throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    limiter.clear(ip)

    // Find the migrated admin user to populate the new session shape
    const adminUser = db.select().from(users).where(eq(users.role, 'admin')).get()
    if (!adminUser) {
        console.error('[tend] No admin user in database — migration may not have run')
        throw createError({ statusCode: 500, message: 'Internal server error' })
    }

    db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, adminUser.id)).run()

    await setUserSession(event, {
        user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role as 'admin' | 'user' },
        sessionVersion: getSessionVersion(),
    })

    return { ok: true }
})
