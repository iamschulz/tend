/**
 * Syncs sessionMaxAgeDays into session.maxAge at startup so the
 * NUXT_SESSION_MAX_AGE_DAYS env var controls the session lifetime.
 */
export default defineNitroPlugin(() => {
    const config = useRuntimeConfig()
    config.session.maxAge = Number(config.sessionMaxAgeDays) * 60 * 60 * 24
})
