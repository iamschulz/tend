import { entries } from '~~/server/database/schema'
import { entryQuerySchema } from '~~/shared/schemas/entryQuery'
import { getDayRange, getWeekRange, getMonthRange, getYearRange } from '~~/shared/utils/dateRanges'

const rangeFns = {
    day: getDayRange,
    week: getWeekRange,
    month: getMonthRange,
    year: getYearRange,
} as const

/**
 * GET /api/entries — Returns entries for the authenticated user.
 * If `range` and `date` query params are provided, filters to entries overlapping that range.
 * If omitted, returns all entries for the user.
 * @param event.query.range - Optional range type: `'day' | 'week' | 'month' | 'year'`
 * @param event.query.date - Optional ISO date string (YYYY-MM-DD) as the reference point
 * @returns Array of entries
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const query = await getValidatedQuery(event, entryQuerySchema.parse)

    const db = useDb()

    if (!query.range || !query.date) {
        return db.select().from(entries).where(eq(entries.userId, userId)).all()
    }

    const [start, end] = rangeFns[query.range](new Date(query.date))
    const startMs = start.getTime()
    const endMs = end.getTime()

    return db
        .select()
        .from(entries)
        .where(
            and(
                eq(entries.userId, userId),
                // Include entries whose time span overlaps the range:
                // entry.start <= rangeEnd AND (entry.end >= rangeStart OR entry.end IS NULL)
                lte(entries.start, endMs),
                or(
                    gte(entries.end, startMs),
                    isNull(entries.end),
                ),
            ),
        )
        .all()
})
