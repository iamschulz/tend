import { entries } from '~~/server/database/schema'

/**
 * DELETE /api/entries/:id — Deletes an entry. Returns 404 if not found.
 * @param event.params.id - The entry UUID
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')!

    const db = useDb()
    const existing = db.select().from(entries).where(eq(entries.id, id)).get()
    if (!existing) {
        throw createError({ statusCode: 404, message: 'Entry not found' })
    }

    db.delete(entries).where(eq(entries.id, id)).run()

    return { ok: true }
})
