import { z } from 'zod'
import { getRequestIP } from 'h3'
import { users } from '~~/server/database/schema'
import { hashPassword } from '~~/server/utils/passwordHash'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { incrementSessionVersion } from '~~/server/utils/sessionVersion'

const updateSchema = z.object({
    role: z.enum(['admin', 'user']).optional(),
    password: z.string().min(8).optional(),
}).refine(data => data.role !== undefined || data.password !== undefined, {
    message: 'At least one of role or password must be provided',
})

const limiter = createRateLimiter(10, 15 * 60 * 1000)

/**
 * PUT /api/admin/users/:id — Updates a user's role and/or password. Admin only.
 * Prevents removing the last admin.
 * Password resets are rate-limited to 10 attempts per IP per 15 minutes.
 * @param event.params.id - The user UUID
 * @param event.body.role - The new role ('admin' | 'user')
 * @param event.body.password - Optional new password (min 8 chars)
 */
export default defineEventHandler(async (event) => {
    requireAdmin(event)

    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    const id = getRouterParam(event, 'id')!
    const { role, password } = await readValidatedBody(event, updateSchema.parse)
    const db = useDb()

    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' })
    }

    // Prevent removing the last admin
    if (role && user.role === 'admin' && role === 'user') {
        const adminCount = db.select().from(users).where(eq(users.role, 'admin')).all().length
        if (adminCount <= 1) {
            throw createError({ statusCode: 400, message: 'Cannot remove the last admin' })
        }
    }

    if (password) {
        if (limiter.isLimited(ip)) {
            throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
        }
        limiter.recordFailure(ip)
    }

    const updates: Record<string, string> = {}
    if (role) updates.role = role
    if (password) updates.passwordHash = await hashPassword(password)

    db.update(users).set(updates).where(eq(users.id, id)).run()

    // If password was changed, invalidate all sessions and re-issue the admin's session
    if (password) {
        const newVersion = incrementSessionVersion()
        const session = await getUserSession(event)
        await setUserSession(event, {
            user: session.user,
            sessionVersion: newVersion,
        })
    }

    return db
        .select({ id: users.id, email: users.email, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .get()
})
