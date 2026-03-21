import { incrementSessionVersion } from '~~/server/utils/sessionVersion'

/**
 * POST /api/auth/revoke — Increments the session version, immediately invalidating
 * all active sessions (including the caller's). The caller must log in again.
 * Requires an authenticated session (enforced by server/middleware/auth.ts).
 */
export default defineEventHandler(async (event) => {
    incrementSessionVersion()
    await clearUserSession(event)
    return { ok: true }
})
