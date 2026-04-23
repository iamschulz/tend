import { entries } from '~~/server/database/schema'

/**
 * DELETE /api/entries/:id — Deletes an entry owned by the authenticated user.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.id - The entry UUID to delete
 * @returns `{ ok: true }`
 * @throws 401 if not authenticated
 * @throws 404 if the entry does not belong to the user
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!
    findByIdAndUserOrThrow(entries, id, userId, 'Entry')

    useDb().delete(entries).where(and(eq(entries.id, id), eq(entries.userId, userId))).run()

    return { ok: true }
})
