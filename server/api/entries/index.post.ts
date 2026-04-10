import { entrySchema } from '~~/shared/schemas/entry'
import { categories, entries } from '~~/server/database/schema'

/**
 * POST /api/entries — Creates a new entry owned by the authenticated user.
 * Verifies the referenced category also belongs to the same user.
 * @param event - The H3 event (must be authenticated)
 * @param event.body.id - Client-generated UUID for the entry
 * @param event.body.start - Start timestamp in epoch milliseconds (UTC)
 * @param event.body.end - End timestamp in epoch milliseconds (UTC), or null if running
 * @param event.body.running - Whether the timer is active
 * @param event.body.categoryId - UUID of the category to associate with
 * @param event.body.comment - Optional note (max 5000 chars)
 * @returns The created entry as stored in the database
 * @throws 401 if not authenticated
 * @throws 404 if the category does not belong to the user
 * @throws 422 if the request body fails validation
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
