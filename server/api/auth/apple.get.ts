import type { H3Event, H3Error } from 'h3'
import { findOrCreateOAuthUser } from '~~/server/utils/oauthUser'

interface AppleUser { name?: { firstName?: string; lastName?: string }; email?: string }
interface ApplePayload { sub: string; email: string }

/**
 * GET /api/auth/apple — Initiates Apple OIDC flow or handles the callback.
 * On success, finds or creates a user and sets the session.
 */
export default defineOAuthAppleEventHandler({
    config: {
        scope: ['name', 'email'],
    },
    /**
     * @param event - The H3 request event
     * @param result - The OAuth result
     * @param result.user - The Apple user profile (only provided on first auth)
     * @param result.payload - The decoded Apple ID token
     * @param result.payload.sub - Apple subject identifier
     * @param result.payload.email - User email
     * @param result.tokens - OAuth tokens
     */
    async onSuccess(event: H3Event, result: { user: AppleUser; payload: ApplePayload; tokens: unknown }) {
        const name = result.user?.name
            ? [result.user.name.firstName, result.user.name.lastName].filter(Boolean).join(' ')
            : result.payload.email

        await findOrCreateOAuthUser(
            event,
            'apple',
            result.payload.sub,
            result.payload.email,
            name,
        )
    },
    /**
     * @param event - The H3 request event
     * @param error - The OAuth error
     */
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] Apple OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'Apple authentication failed' })
    },
})
