import type { H3Event } from 'h3'

/**
 * Throws 403 if the authenticated user is not an admin.
 * @param event - The H3 request event
 */
export function requireAdmin(event: H3Event): void {
    if (event.context.userRole !== 'admin') {
        throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
    }
}
