import { apiTokens } from '~~/server/database/schema'

/**
 * GET /api/auth/tokens — Lists all API tokens for the authenticated user.
 * Returns token metadata only — hashes are never exposed.
 * @param event - The H3 event (must be authenticated)
 * @returns Array of `{ id, label, expiresAt, createdAt, lastUsedAt }`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const db = useDb()

    return db
        .select({
            id: apiTokens.id,
            label: apiTokens.label,
            expiresAt: apiTokens.expiresAt,
            createdAt: apiTokens.createdAt,
            lastUsedAt: apiTokens.lastUsedAt,
        })
        .from(apiTokens)
        .where(eq(apiTokens.userId, userId))
        .all()
})
