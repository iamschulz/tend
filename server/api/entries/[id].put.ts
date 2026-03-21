import { entryUpdateSchema } from '~~/shared/schemas/entry'
import { entries } from '~~/server/database/schema'

/**
 * PUT /api/entries/:id — Partially updates an entry. Returns 404 if not found.
 * @param event.params.id - The entry UUID
 * @param event.body - Partial entry data validated against `entryUpdateSchema`
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')!
    const body = await readValidatedBody(event, entryUpdateSchema.parse)

    findByIdOrThrow(entries, id, 'Entry')

    const db = useDb()
    db.update(entries).set(body).where(eq(entries.id, id)).run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
