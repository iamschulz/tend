import { idbStorage } from '~/util/idbStorage'

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

    // No active session (never logged in, or the session expired server-side):
    // make sure no stale user data lingers in memory or IndexedDB. logout()
    // handles the explicit case, but expiry redirects here without running it.
    // Guarded so fresh visits and SSR (empty store) stay no-ops.
    if (!loggedIn.value) {
        const data = useDataStore()
        if (data.categories.length || data.entries.length) {
            data.reset()
            idbStorage.clear()
        }
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
