import type { H3Event, H3Error } from 'h3'
import { findOrCreateOAuthUser } from '~~/server/utils/oauthUser'

/**
 * GET /api/auth/github — Initiates GitHub OAuth flow or handles the callback.
 * On success, finds or creates a user and sets the session.
 */
export default defineOAuthGitHubEventHandler({
    config: {
        emailRequired: true,
    },
    /**
     * @param event - The H3 request event
     * @param result - The OAuth result
     * @param result.user - The GitHub user profile
     * @param result.user.id - GitHub user ID
     * @param result.user.email - User email (may be null if private)
     * @param result.user.name - User display name
     * @param result.user.login - GitHub username
     * @param result.tokens - OAuth tokens
     */
    async onSuccess(event: H3Event, result: { user: { id: number; email: string | null; name: string; login: string }; tokens: unknown }) {
        if (!result.user.email) {
            throw createError({ statusCode: 400, statusMessage: 'GitHub account has no public email. Please set one in GitHub settings.' })
        }

        await findOrCreateOAuthUser(
            event,
            'github',
            String(result.user.id),
            result.user.email,
            result.user.name || result.user.login,
        )
    },
    /**
     * @param event - The H3 request event
     * @param error - The OAuth error
     */
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] GitHub OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'GitHub authentication failed' })
    },
})
