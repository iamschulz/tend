import { getSessionVersion } from '~~/server/utils/sessionVersion'

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
 * Server auth middleware — guards all /api/ routes except public ones.
 * Validates the session and its version, then populates event.context with
 * the authenticated user's ID and role for downstream handlers.
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

    await requireUserSession(event)

    const session = await getUserSession(event)
    if (session.sessionVersion !== getSessionVersion()) {
        await clearUserSession(event)
        throw createError({ statusCode: 401, message: 'Session expired' })
    }

    if (session.user) {
        event.context.userId = session.user.id
        event.context.userRole = session.user.role
    }
})
