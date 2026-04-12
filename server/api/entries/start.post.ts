import { randomUUID } from 'node:crypto'
import { entryStartSchema } from '~~/shared/schemas/entryStart'
import { categories, entries } from '~~/server/database/schema'

/**
 * POST /api/entries/start — Starts a new timed entry for the authenticated user.
 * The server sets `start` to the current time; clients cannot forge timestamps.
 * Only one running entry per category is allowed.
 * @param event - The H3 event (must be authenticated)
 * @param event.body.categoryId - UUID of the category to track
 * @param event.body.comment - Optional note (max 5000 chars)
 * @returns The newly created running entry
 * @throws 404 if the category does not belong to the user
 * @throws 409 if the category already has a running entry
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, entryStartSchema.parse)

    findByIdAndUserOrThrow(categories, body.categoryId, userId, 'Category')

    const db = useDb()
    const id = randomUUID()
    const now = Date.now()

    // Transaction ensures the running-check and insert are atomic,
    // preventing two concurrent requests from both passing the check.
    const created = db.transaction((tx) => {
        const running = tx
            .select({ id: entries.id })
            .from(entries)
            .where(and(eq(entries.userId, userId), eq(entries.categoryId, body.categoryId), eq(entries.running, true)))
            .get()

        if (running) {
            throw createError({ statusCode: 409, statusMessage: 'This category already has a running timer' })
        }

        tx.insert(entries).values({
            id,
            userId,
            categoryId: body.categoryId,
            start: now,
            end: null,
            running: true,
            comment: body.comment,
        }).run()

        return tx.select().from(entries).where(eq(entries.id, id)).get()!
    })

    return created
})
