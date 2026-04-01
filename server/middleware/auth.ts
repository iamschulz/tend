import { getSessionVersion } from '~~/server/utils/sessionVersion'

const publicRoutes = ['/api/auth/login', '/api/auth/session', '/api/_auth/session']

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    if (config.public.backendMode !== 'server') return

    const path = getRequestURL(event).pathname

    if (!path.startsWith('/api/') || publicRoutes.includes(path)) {
        return
    }

    await requireUserSession(event)

    const session = await getUserSession(event)
    if (session.sessionVersion !== getSessionVersion()) {
        await clearUserSession(event)
        throw createError({ statusCode: 401, message: 'Session expired' })
    }
})
