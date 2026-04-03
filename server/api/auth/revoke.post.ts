import { incrementSessionVersion } from '~~/server/utils/sessionVersion'

/**
 * POST /api/auth/revoke — Increments the session version, immediately invalidating
 * all active sessions (including the caller's). The caller must log in again.
 * Restricted to admin users.
 */
export default defineEventHandler(async (event) => {
    if (event.context.userRole !== 'admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
    }

    incrementSessionVersion()
    await clearUserSession(event)
    return { ok: true }
})
