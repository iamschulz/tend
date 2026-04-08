import type { H3Event, H3Error } from 'h3'
import { findOrCreateOAuthUser } from '~~/server/utils/oauthUser'

/**
 * GET /api/auth/google — Initiates Google OIDC flow or handles the callback.
 * On success, finds or creates a user and sets the session.
 */
export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['email', 'profile'],
    },
    /**
     * @param event - The H3 request event
     * @param result - The OAuth result
     * @param result.user - The Google user profile
     * @param result.user.sub - Google subject identifier
     * @param result.user.email - User email
     * @param [result.user.name] - User display name
     * @param result.tokens - OAuth tokens
     */
    async onSuccess(event: H3Event, result: { user: { sub: string; email: string; name?: string }; tokens: unknown }) {
        await findOrCreateOAuthUser(
            event,
            'google',
            result.user.sub,
            result.user.email,
            result.user.name ?? result.user.email,
        )
    },
    /**
     * @param event - The H3 request event
     * @param error - The OAuth error
     */
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] Google OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'Google authentication failed' })
    },
})
