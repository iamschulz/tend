import { getDatabase } from '../database'
import type { DbTable } from '../database/schema'

/** Re-exported Drizzle helpers, auto-imported in all server routes by Nitro. */
export { eq } from 'drizzle-orm'

/** Returns the Drizzle database instance. Auto-imported in all server routes by Nitro. */
export function useDb() {
    return getDatabase()
}

/**
 * Looks up a row by ID or throws a 404 error.
 * @param table - The Drizzle table to query
 * @param id - The row ID
 * @param label - Human-readable name for the error message (e.g. "Category")
 */
export function findByIdOrThrow(table: DbTable, id: string, label: string) {
    const db = useDb()
    const row = db.select().from(table).where(eq(table.id, id)).get()
    if (!row) {
        throw createError({ statusCode: 404, message: `${label} not found` })
    }
    return row
}
