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
    async onSuccess(event: H3Event, { user }: { user: { id: number; email: string | null; name: string; login: string }; tokens: unknown }) {
        if (!user.email) {
            throw createError({ statusCode: 400, statusMessage: 'GitHub account has no public email. Please set one in GitHub settings.' })
        }

        await findOrCreateOAuthUser(
            event,
            'github',
            String(user.id),
            user.email,
            user.name || user.login,
        )
    },
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] GitHub OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'GitHub authentication failed' })
    },
})
