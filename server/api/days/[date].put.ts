import { randomUUID } from 'node:crypto'
import { days } from '~~/server/database/schema'
import { dayDateParamSchema, dayUpdateSchema } from '~~/shared/schemas/day'

/**
 * PUT /api/days/:date — Upserts the daily note for the authenticated user.
 * Creates a new `days` row if none exists for this (user, date), otherwise
 * updates the existing row's `notes`. Returns the resulting `{ date, notes }`.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.date - Calendar date in YYYY-MM-DD format (validated)
 * @param event.body.notes - Free-form note text (max 10000 characters)
 * @returns The persisted `{ date, notes }` record
 * @throws 401 if not authenticated
 * @throws 422 if the body or date fails validation
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const rawDate = getRouterParam(event, 'date')!
    const parsed = dayDateParamSchema.safeParse({ date: rawDate })
    if (!parsed.success) {
        throw createError({ statusCode: 422, statusMessage: 'Invalid date parameter' })
    }
    const { date } = parsed.data
    const { notes } = await readValidatedBody(event, dayUpdateSchema.parse)

    const db = useDb()

    // Upsert atomically: check-then-insert/update inside a single transaction.
    const saved = db.transaction((tx) => {
        const existing = tx
            .select()
            .from(days)
            .where(and(eq(days.userId, userId), eq(days.date, date)))
            .get()

        if (existing) {
            tx.update(days).set({ notes }).where(eq(days.id, existing.id)).run()
            return { date, notes }
        }

        tx.insert(days).values({
            id: randomUUID(),
            userId,
            date,
            notes,
        }).run()
        return { date, notes }
    })

    return saved
})
