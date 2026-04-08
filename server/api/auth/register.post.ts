import { z } from 'zod'
import { getRequestIP } from 'h3'
import crypto from 'node:crypto'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { logAuthEvent } from '~~/server/utils/authLogger'
import { hashPassword } from '~~/server/utils/passwordHash'
import { getSessionVersion } from '~~/server/utils/sessionVersion'
import { users, allowedEmails } from '~~/server/database/schema'

const registerSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8),
})

const limiter = createRateLimiter(5, 15 * 60 * 1000)

/**
 * POST /api/auth/register — Creates a new password-based account.
 * First user becomes admin automatically. Subsequent users must be on the allowlist.
 * Rate-limited to 5 attempts per IP per 15 minutes.
 */
export default defineEventHandler(async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    if (limiter.isLimited(ip)) {
        logAuthEvent('rate-limited', ip, 'unknown', '/api/auth/register')
        throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
    }

    const { email, name, password } = await readValidatedBody(event, registerSchema.parse)
    const db = useDb()
    const passwordHash = await hashPassword(password)

    // Transaction prevents race conditions (e.g. two concurrent requests
    // both seeing zero users and both becoming admin)
    let userId: string
    let role: 'admin' | 'user'

    try {
        const result = db.transaction((tx) => {
            const existing = tx.select().from(users).where(eq(users.email, email)).get()
            if (existing) throw new Error('__rejected__')

            const isFirstUser = tx.select().from(users).all().length === 0

            if (!isFirstUser) {
                const allowed = tx.select().from(allowedEmails).where(eq(allowedEmails.email, email)).get()
                if (!allowed) throw new Error('__rejected__')
                tx.delete(allowedEmails).where(eq(allowedEmails.id, allowed.id)).run()
            }

            const id = crypto.randomUUID()
            const userRole = isFirstUser ? 'admin' as const : 'user' as const

            tx.insert(users).values({
                id,
                email,
                name,
                passwordHash,
                role: userRole,
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
            }).run()

            if (isFirstUser) {
                console.log(`[tend] First user registered as admin via password`)
            }

            return { id, role: userRole }
        })

        userId = result.id
        role = result.role
    }
    catch (e) {
        if ((e as Error).message === '__rejected__') {
            limiter.recordFailure(ip)
            logAuthEvent('registration-rejected', ip, email, '/api/auth/register')
            throw createError({ statusCode: 403, message: 'Registration not allowed' })
        }
        throw e
    }

    limiter.clear(ip)
    logAuthEvent('registration-success', ip, email, '/api/auth/register')

    await setUserSession(event, {
        user: { id: userId, email, name, role },
        sessionVersion: getSessionVersion(),
    })

    return { ok: true }
})
