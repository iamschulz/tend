import { entryCreateSchema } from '~~/shared/schemas/entry'
import { entries } from '~~/server/database/schema'

/**
 * POST /api/entries — Creates a new entry. Generates a server-side UUID.
 * @param event.body - Entry data validated against `entryCreateSchema`
 */
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, entryCreateSchema.parse)
    const id = crypto.randomUUID()

    const db = useDb()
    db.insert(entries).values({
        id,
        categoryId: body.categoryId,
        start: body.start,
        end: body.end,
        running: body.running,
        comment: body.comment,
    }).run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
