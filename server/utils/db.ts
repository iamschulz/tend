import { eq, and, gte, lte, or, isNull } from 'drizzle-orm'
import { getDatabase } from '../database'
import type { DbTable } from '../database/schema'

/** Re-exported Drizzle helpers, auto-imported in all server routes by Nitro. */
export { eq, and, gte, lte, or, isNull }

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

/**
 * Looks up a row by ID and user ID, or throws a 404 error.
 * Prevents cross-user data access by requiring both ID and userId to match.
 * @param table - The Drizzle table to query (must have a userId column)
 * @param id - The row ID
 * @param userId - The authenticated user's ID
 * @param label - Human-readable name for the error message (e.g. "Category")
 */
export function findByIdAndUserOrThrow(table: DbTable, id: string, userId: string, label: string) {
    const db = useDb()
    const row = db
        .select()
        .from(table)
        .where(and(eq(table.id, id), eq(table.userId, userId)))
        .get()
    if (!row) {
        throw createError({ statusCode: 404, message: `${label} not found` })
    }
    return row
}
