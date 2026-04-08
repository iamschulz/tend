import type { H3Event } from 'h3'

/**
 * Returns the authenticated user's ID from the event context.
 * Throws 401 if no user is authenticated.
 * @param event
 */
export function requireUserId(event: H3Event): string {
    const userId = event.context.userId as string | undefined
    if (!userId) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    return userId
}
