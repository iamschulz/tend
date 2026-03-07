const publicRoutes = ['/api/auth/login', '/api/auth/session']

export default defineEventHandler(async (event) => {
    const path = getRequestURL(event).pathname

    if (!path.startsWith('/api/') || publicRoutes.includes(path)) {
        return
    }

    await requireUserSession(event)
})
