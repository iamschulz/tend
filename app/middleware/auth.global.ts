export default defineNuxtRouteMiddleware(async (to) => {
    if (import.meta.prerender) return

    const config = useRuntimeConfig()
    if (config.public.backendMode !== 'server') return

    const { loggedIn, fetch: fetchSession } = useUserSession()

    if (!loggedIn.value) {
        await fetchSession()
    }

    if (!loggedIn.value && to.path !== '/login') {
        return navigateTo('/login')
    }

    if (loggedIn.value && to.path === '/login') {
        return navigateTo('/')
    }
})
