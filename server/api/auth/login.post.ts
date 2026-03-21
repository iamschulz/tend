import { z } from 'zod'
import { getRequestIP } from 'h3'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { safeCompare } from '~~/server/utils/safeCompare'
import { getSessionVersion } from '~~/server/utils/sessionVersion'
import { verifyPassword, isBcryptHash } from '~~/server/utils/passwordHash'

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})

const limiter = createRateLimiter(5, 15 * 60 * 1000)

/**
 * POST /api/auth/login — Validates credentials and creates an authenticated session.
 * Rate-limited to 5 failed attempts per IP per 15 minutes.
 * Requires NUXT_ADMIN_PASSWORD to be a bcrypt hash; returns 500 otherwise.
 * @param event - The H3 request event
 * @returns `{ ok: true }` on success; throws 401 on bad credentials, 429 on rate limit
 */
export default defineEventHandler(async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    if (limiter.isLimited(ip)) {
        throw createError({ statusCode: 429, message: 'Too many login attempts. Try again later.' })
    }

    const { username, password } = await readValidatedBody(event, loginSchema.parse)
    const config = useRuntimeConfig()

    if (!config.adminUsername || !config.adminPassword) {
        throw createError({ statusCode: 500, message: 'Admin credentials not configured' })
    }

    if (!isBcryptHash(config.adminPassword)) {
        throw createError({ statusCode: 500, message: 'NUXT_ADMIN_PASSWORD must be a bcrypt hash' })
    }

    const validUsername = safeCompare(username, config.adminUsername)
    const validPassword = await verifyPassword(password, config.adminPassword)
    if (!validUsername || !validPassword) {
        limiter.recordFailure(ip)
        throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    limiter.clear(ip)

    await setUserSession(event, {
        user: { username },
        sessionVersion: getSessionVersion(),
    })

    return { ok: true }
})
