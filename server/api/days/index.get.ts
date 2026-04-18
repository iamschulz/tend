import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { days } from '~~/server/database/schema'

const querySchema = z.object({
    q: z.string().min(1).max(200),
})

const MAX_RESULTS = 1000

/**
 * GET /api/days?q=... — Returns day records whose notes contain `q`
 * (case-insensitive ASCII substring) for the authenticated user.
 * Capped at MAX_RESULTS rows to bound payload size. `%` and `_` in `q`
 * are escaped so they cannot act as LIKE wildcards.
 * @throws 401 if not authenticated
 * @throws 422 if `q` is missing or invalid
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const parsed = querySchema.safeParse(getQuery(event))
    if (!parsed.success) {
        throw createError({ statusCode: 422, statusMessage: 'Invalid query' })
    }

    const needle = parsed.data.q.toLowerCase().replace(/[\\%_]/g, '\\$&')
    const pattern = `%${needle}%`

    const db = useDb()

    return db
        .select({ date: days.date, notes: days.notes })
        .from(days)
        .where(and(
            eq(days.userId, userId),
            sql`LOWER(${days.notes}) LIKE ${pattern} ESCAPE '\\'`,
        ))
        .limit(MAX_RESULTS)
        .all()
})
