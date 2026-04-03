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
    async onSuccess(event: H3Event, { user }: { user: { sub: string; email: string; name?: string }; tokens: unknown }) {
        await findOrCreateOAuthUser(
            event,
            'google',
            user.sub,
            user.email,
            user.name ?? user.email,
        )
    },
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] Google OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'Google authentication failed' })
    },
})
