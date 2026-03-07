import { entrySchema } from '~~/shared/schemas/entry'
import { entries } from '~~/server/database/schema'

/**
 * POST /api/entries — Creates a new entry with a client-provided UUID.
 * @param event.body - Entry data validated against `entrySchema`
 */
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, entrySchema.parse)

    const db = useDb()
    db.insert(entries).values({
        id: body.id,
        categoryId: body.categoryId,
        start: body.start,
        end: body.end,
        running: body.running,
        comment: body.comment,
    }).run()

    return db.select().from(entries).where(eq(entries.id, body.id)).get()!
})
