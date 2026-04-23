import { z } from 'zod'
import { getRequestIP } from 'h3'
import { users } from '~~/server/database/schema'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { logAuthEvent } from '~~/server/utils/authLogger'
import { bcryptHash, verifyPasswordHash, isBcryptHash } from '~~/server/utils/passwordHash'
import { incrementSessionVersion } from '~~/server/utils/sessionVersion'

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
})

const limiter = createRateLimiter(5, 15 * 60 * 1000)

/**
 * POST /api/auth/change-password — Lets an authenticated user change their own password.
 * Requires the current password for verification.
 * Only works for users who have a password (not OAuth-only users).
 * Rate-limited to 5 failed attempts per IP per 15 minutes.
 * @param event - The H3 request event
 * @param event.body.currentPassword - The user's current password
 * @param event.body.newPassword - The desired new password (min 8 chars)
 */
export default defineEventHandler(async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    if (limiter.isLimited(ip)) {
        logAuthEvent('rate-limited', ip, 'unknown', '/api/auth/change-password')
        throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
    }

    const userId = event.context.userId
    if (!userId) {
        throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }

    const { currentPassword, newPassword } = await readValidatedBody(event, changePasswordSchema.parse)
    const db = useDb()

    const user = db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    if (!user.passwordHash || !isBcryptHash(user.passwordHash)) {
        throw createError({ statusCode: 400, statusMessage: 'No password set for this account' })
    }

    const valid = await verifyPasswordHash(currentPassword, user.passwordHash)
    if (!valid) {
        limiter.recordFailure(ip)
        logAuthEvent('authentication-failure', ip, user.email, '/api/auth/change-password')
        throw createError({ statusCode: 401, statusMessage: 'Invalid current password' })
    }

    limiter.clear(ip)
    logAuthEvent('authentication-success', ip, user.email, '/api/auth/change-password')

    const newHash = await bcryptHash(newPassword)
    db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId)).run()

    // Invalidate all sessions, then re-issue the current user's session
    const newVersion = incrementSessionVersion()
    await setUserSession(event, {
        user: { id: user.id, email: user.email, name: user.name, role: user.role as 'admin' | 'user' },
        sessionVersion: newVersion,
    })

    return { ok: true }
})
