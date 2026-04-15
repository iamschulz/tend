import { entries } from '~~/server/database/schema'
import { entryQuerySchema } from '~~/shared/schemas/entryQuery'
import { getDayRangeUTC, getWeekRangeUTC, getMonthRangeUTC, getYearRangeUTC } from '~~/shared/utils/dateRanges'

const rangeFns = {
    day: getDayRangeUTC,
    week: getWeekRangeUTC,
    month: getMonthRangeUTC,
    year: getYearRangeUTC,
} as const

/**
 * GET /api/entries — Returns entries for the authenticated user.
 * If `range` and `date` query params are provided, filters to entries overlapping that range.
 * If omitted, returns all entries for the user.
 * Dates are interpreted as **UTC** — `date=2026-04-10` covers midnight-to-midnight UTC.
 * @param event.query.range - Optional range type: `'day' | 'week' | 'month' | 'year'`
 * @param event.query.date - Optional ISO date string (YYYY-MM-DD), interpreted as UTC
 * @returns Array of entries
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const query = await getValidatedQuery(event, entryQuerySchema.parse)

    const db = useDb()

    if (!query.range || !query.date) {
        return db.select().from(entries).where(eq(entries.userId, userId)).all()
    }

    const [startMs, endMs] = rangeFns[query.range](new Date(query.date))

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
