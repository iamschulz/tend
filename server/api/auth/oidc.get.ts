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
    /**
     * @param event - The H3 request event
     * @param result - The OAuth result
     * @param result.user - The OIDC user claims
     * @param result.user.sub - Subject identifier
     * @param [result.user.email] - User email
     * @param [result.user.name] - User display name
     * @param [result.user.preferred_username] - Preferred username
     * @param result.tokens - OAuth tokens
     */
    async onSuccess(event: H3Event, result: { user: { sub: string; email?: string; name?: string; preferred_username?: string }; tokens: unknown }) {
        const email = result.user.email
        if (!email) {
            throw createError({ statusCode: 400, statusMessage: 'OIDC provider did not return an email address' })
        }

        await findOrCreateOAuthUser(
            event,
            'oidc',
            result.user.sub,
            email,
            result.user.name || result.user.preferred_username || email,
        )
    },
    /**
     * @param event - The H3 request event
     * @param error - The OAuth error
     */
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] OIDC error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'OIDC authentication failed' })
    },
})
