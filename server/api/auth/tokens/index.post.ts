import { randomUUID } from 'node:crypto'
import { apiTokenCreateSchema } from '~~/shared/schemas/apiToken'
import { apiTokens } from '~~/server/database/schema'
import { generateApiToken } from '~~/server/utils/apiToken'

/**
 * POST /api/auth/tokens — Creates a new API token for the authenticated user.
 * The plaintext token is returned **once** in the response and never stored.
 * @param event - The H3 event (must be authenticated)
 * @param event.body - `{ label: string, expiresAt?: number }`
 * @returns `{ id, token, label, expiresAt, createdAt }` where `token` is the plaintext
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, apiTokenCreateSchema.parse)

    const { plaintext, hash } = generateApiToken()
    const id = randomUUID()
    const now = Date.now()

    const db = useDb()
    db.insert(apiTokens).values({
        id,
        userId,
        tokenHash: hash,
        label: body.label,
        expiresAt: body.expiresAt ?? null,
        createdAt: now,
        lastUsedAt: null,
    }).run()

    return {
        id,
        token: plaintext,
        label: body.label,
        expiresAt: body.expiresAt ?? null,
        createdAt: now,
    }
})
