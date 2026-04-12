import { randomUUID } from 'node:crypto'
import { entryCreateSchema } from '~~/shared/schemas/entry'
import { categories, entries } from '~~/server/database/schema'

/**
 * POST /api/entries — Creates a new entry owned by the authenticated user.
 * Verifies the referenced category also belongs to the same user.
 * If no `id` is provided, the server generates one.
 * @param event - The H3 event (must be authenticated)
 * @param event.body.start - Start timestamp in epoch milliseconds (UTC)
 * @param event.body.end - End timestamp in epoch milliseconds (UTC), or null if running
 * @param event.body.running - Whether the timer is active
 * @param event.body.categoryId - UUID of the category to associate with
 * @param event.body.comment - Note (max 5000 chars)
 * @returns The created entry as stored in the database
 * @throws 401 if not authenticated
 * @throws 404 if the category does not belong to the user
 * @throws 422 if the request body fails validation
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, entryCreateSchema.parse)

    // Verify the referenced category belongs to this user
    findByIdAndUserOrThrow(categories, body.categoryId, userId, 'Category')

    const id = body.id ?? randomUUID()
    const db = useDb()

    // Transaction ensures the duplicate-check and insert are atomic.
    const created = db.transaction((tx) => {
        if (body.id) {
            const existing = tx.select({ id: entries.id }).from(entries).where(eq(entries.id, id)).get()
            if (existing) {
                throw createError({ statusCode: 409, statusMessage: 'An entry with this ID already exists' })
            }
        }

        tx.insert(entries).values({
            id,
            userId,
            categoryId: body.categoryId,
            start: body.start,
            end: body.end,
            running: body.running,
            comment: body.comment,
        }).run()

        return tx.select().from(entries).where(eq(entries.id, id)).get()!
    })

    return created
})
