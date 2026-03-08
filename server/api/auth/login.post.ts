import { z } from 'zod'
import { getRequestIP } from 'h3'
import { createRateLimiter } from '~~/server/utils/rateLimiter'
import { safeCompare } from '~~/server/utils/safeCompare'

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})

const limiter = createRateLimiter(5, 15 * 60 * 1000)

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

    if (!safeCompare(username, config.adminUsername) || !safeCompare(password, config.adminPassword)) {
        limiter.recordFailure(ip)
        throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    limiter.clear(ip)

    await setUserSession(event, {
        user: { username },
    })

    return { ok: true }
})
