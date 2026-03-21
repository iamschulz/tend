import { entries } from '~~/server/database/schema'

/**
 * DELETE /api/entries/:id — Deletes an entry. Returns 404 if not found.
 * @param event.params.id - The entry UUID
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')!
    findByIdOrThrow(entries, id, 'Entry')

    useDb().delete(entries).where(eq(entries.id, id)).run()

    return { ok: true }
})
