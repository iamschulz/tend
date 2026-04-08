/**
 * Global client-side auth middleware.
 * Redirects unauthenticated users to /login, logged-in users away from /login,
 * and non-admins away from /admin. Only active in server mode.
 * @param to - The target route
 */
export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.prerender) return

    const config = useRuntimeConfig()
    if (config.public.backendMode !== 'server') {
        if (to.path === '/admin') return navigateTo('/')
        return
    }

    const { loggedIn, user, fetch: fetchSession } = useUserSession()

    if (!loggedIn.value) {
        await fetchSession()
    }

    if (!loggedIn.value && to.path !== '/login') {
        return navigateTo('/login')
    }

    if (loggedIn.value && to.path === '/login') {
        return navigateTo('/')
    }

    if (to.path === '/admin' && user.value?.role !== 'admin') {
        return navigateTo('/')
    }
})
