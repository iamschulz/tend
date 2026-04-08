/**
 * GET /api/auth/providers — Returns which OAuth providers are configured.
 * Used by the login page to decide which sign-in buttons to show.
 */
export default defineEventHandler(() => {
    const config = useRuntimeConfig()
    return {
        google: !!(config.oauth?.google?.clientId && config.oauth?.google?.clientSecret),
        apple: !!(config.oauth?.apple?.clientId && config.oauth?.apple?.privateKey),
        github: !!(config.oauth?.github?.clientId && config.oauth?.github?.clientSecret),
        oidc: !!(config.oauth?.oidc?.clientId && config.oauth?.oidc?.clientSecret && config.oauth?.oidc?.openidConfig),
        password: true,
    }
})
