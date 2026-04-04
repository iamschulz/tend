import { z } from 'zod'
import { getRequestIP } from 'h3'
import crypto from 'node:crypto'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
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
        throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
    }

    const { email, name, password } = await readValidatedBody(event, registerSchema.parse)
    const db = useDb()

    // Check if email is already taken
    const existing = db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
        limiter.recordFailure(ip)
        throw createError({ statusCode: 409, message: 'An account with this email already exists' })
    }

    // First user becomes admin, others need to be on the allowlist
    const userCount = db.select().from(users).all().length
    const isFirstUser = userCount === 0

    if (!isFirstUser) {
        const allowed = db.select().from(allowedEmails).where(eq(allowedEmails.email, email)).get()
        if (!allowed) {
            limiter.recordFailure(ip)
            throw createError({ statusCode: 403, message: 'Registration not allowed' })
        }
        db.delete(allowedEmails).where(eq(allowedEmails.id, allowed.id)).run()
    }

    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(password)

    db.insert(users).values({
        id: userId,
        email,
        name,
        passwordHash,
        role: isFirstUser ? 'admin' : 'user',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
    }).run()

    if (isFirstUser) {
        console.log(`[tend] First user "${name}" (${email}) registered as admin via password`)
    }

    limiter.clear(ip)

    await setUserSession(event, {
        user: { id: userId, email, name, role: isFirstUser ? 'admin' : 'user' },
        sessionVersion: getSessionVersion(),
    })

    return { ok: true }
})
