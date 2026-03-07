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

    const db = useDb()
    const existing = db.select().from(entries).where(eq(entries.id, id)).get()
    if (!existing) {
        throw createError({ statusCode: 404, message: 'Entry not found' })
    }

    const values: Record<string, unknown> = {}
    if (body.start !== undefined) values.start = body.start
    if (body.end !== undefined) values.end = body.end
    if (body.running !== undefined) values.running = body.running
    if (body.categoryId !== undefined) values.categoryId = body.categoryId
    if (body.comment !== undefined) values.comment = body.comment

    db.update(entries).set(values).where(eq(entries.id, id)).run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
