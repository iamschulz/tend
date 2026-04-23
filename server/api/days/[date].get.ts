import { days } from '~~/server/database/schema'
import { dayDateParamSchema } from '~~/shared/schemas/day'

/**
 * GET /api/days/:date — Returns the day record for the authenticated user on the given date.
 * If no record exists for this (user, date), responds with an empty-notes stub
 * so the caller can always bind to `{ date, notes }` without a separate "not found" path.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.date - Calendar date in YYYY-MM-DD format (validated)
 * @returns `{ date, notes }` — `notes` is '' if no row exists yet
 * @throws 401 if not authenticated
 * @throws 422 if the date parameter fails validation
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const rawDate = getRouterParam(event, 'date')!
    const parsed = dayDateParamSchema.safeParse({ date: rawDate })
    if (!parsed.success) {
        throw createError({ statusCode: 422, statusMessage: 'Invalid date parameter' })
    }
    const { date } = parsed.data

    const db = useDb()
    const row = db
        .select()
        .from(days)
        .where(and(eq(days.userId, userId), eq(days.date, date)))
        .get()

    return { date, notes: row?.notes ?? '' }
})
