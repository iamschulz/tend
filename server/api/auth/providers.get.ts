import { users, allowedEmails } from '~~/server/database/schema'

/**
 * GET /api/auth/providers — Returns which OAuth providers are configured.
 * Used by the login page to decide which sign-in buttons to show.
 *
 * `canRegister` tells the login page whether to offer the register option:
 * registration is only possible while the installation is unconfigured
 * (no users yet, so the first user bootstraps as admin) or while there is
 * at least one open invitation on the allowlist.
 */
export default defineEventHandler(() => {
    const config = useRuntimeConfig()
    const db = useDb()

    const hasUsers = !!db.select().from(users).limit(1).get()
    const hasOpenInvites = !!db.select().from(allowedEmails).limit(1).get()

    return {
        google: !!(config.oauth?.google?.clientId && config.oauth?.google?.clientSecret),
        apple: !!(config.oauth?.apple?.clientId && config.oauth?.apple?.privateKey),
        github: !!(config.oauth?.github?.clientId && config.oauth?.github?.clientSecret),
        oidc: !!(config.oauth?.oidc?.clientId && config.oauth?.oidc?.clientSecret && config.oauth?.oidc?.openidConfig),
        password: true,
        canRegister: !hasUsers || hasOpenInvites,
    }
})
