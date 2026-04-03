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
    async onSuccess(event: H3Event, { user, payload }: { user: AppleUser; payload: ApplePayload; tokens: unknown }) {
        const name = user?.name
            ? [user.name.firstName, user.name.lastName].filter(Boolean).join(' ')
            : payload.email

        await findOrCreateOAuthUser(
            event,
            'apple',
            payload.sub,
            payload.email,
            name,
        )
    },
    onError(event: H3Event, error: H3Error) {
        console.error('[tend] Apple OAuth error:', error.message)
        throw createError({ statusCode: 401, statusMessage: 'Apple authentication failed' })
    },
})
