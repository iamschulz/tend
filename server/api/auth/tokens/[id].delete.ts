import { apiTokens } from '~~/server/database/schema'

/**
 * DELETE /api/auth/tokens/:id — Revokes (deletes) an API token.
 * Only the owning user can delete their own tokens.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.id - The token UUID to revoke
 * @returns `{ ok: true }`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!

    const db = useDb()
    const token = db
        .select({ id: apiTokens.id })
        .from(apiTokens)
        .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)))
        .get()

    if (!token) {
        throw createError({ statusCode: 404, statusMessage: 'Token not found' })
    }

    db.delete(apiTokens)
        .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)))
        .run()

    return { ok: true }
})
