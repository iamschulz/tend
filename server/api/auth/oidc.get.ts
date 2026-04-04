import type { H3Event, H3Error } from 'h3'
import { findOrCreateOAuthUser } from '~~/server/utils/oauthUser'

/**
 * GET /api/auth/oidc — Initiates a generic OIDC flow (e.g. Authelia, Authentik, Keycloak)
 * or handles the callback. On success, finds or creates a user and sets the session.
 */
export default defineOAuthOidcEventHandler({
    config: {
        scope: ['openid', 'profile', 'email'],
    },
    async onSuccess(event: H3Event, { user }: { user: { sub: string; email?: string; name?: string; preferred_username?: string }; tokens: unknown }) {
        const email = user.email
        if (!email) {
            throw createError({ statusCode: 400, statusMessage: 'OIDC provider did not return an email address' })
        }

        await findOrCreateOAuthUser(
            event,
            'oidc',
            user.sub,
            email,
            user.name || user.preferred_username || email,
        )
    },
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] OIDC error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'OIDC authentication failed' })
    },
})
