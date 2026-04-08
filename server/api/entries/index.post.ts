import { entrySchema } from '~~/shared/schemas/entry'
import { categories, entries } from '~~/server/database/schema'

/**
 * POST /api/entries — Creates a new entry owned by the authenticated user.
 * Verifies the referenced category also belongs to the same user.
 * @param event.body - Entry data validated against `entrySchema`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, entrySchema.parse)

    // Verify the referenced category belongs to this user
    findByIdAndUserOrThrow(categories, body.categoryId, userId, 'Category')

    const db = useDb()
    db.insert(entries).values({
        id: body.id,
        userId,
        categoryId: body.categoryId,
        start: body.start,
        end: body.end,
        running: body.running,
        comment: body.comment,
    }).run()

    return db.select().from(entries).where(eq(entries.id, body.id)).get()!
})
