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

    // Prevent multiple concurrent timers for the same category
    const running = db
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.userId, userId), eq(entries.categoryId, body.categoryId), eq(entries.running, true)))
        .get()

    if (running) {
        throw createError({ statusCode: 409, statusMessage: 'This category already has a running timer' })
    }

    const id = randomUUID()
    const now = Date.now()

    db.insert(entries).values({
        id,
        userId,
        categoryId: body.categoryId,
        start: now,
        end: null,
        running: true,
        comment: body.comment,
    }).run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
