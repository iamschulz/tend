import { eq } from 'drizzle-orm'
import { getDatabase } from '../database'
import { sessionMeta } from '../database/schema'

/**
 * Returns the current session version from the database.
 * All active sessions must carry this version to be considered valid.
 */
export function getSessionVersion(): number {
    const row = getDatabase().select().from(sessionMeta).where(eq(sessionMeta.id, 1)).get()
    return row?.sessionVersion ?? 1
}

/**
 * Increments the session version, immediately invalidating all existing sessions.
 * @returns The new session version.
 */
export function incrementSessionVersion(): number {
    const db = getDatabase()
    const next = getSessionVersion() + 1
    db.update(sessionMeta).set({ sessionVersion: next }).where(eq(sessionMeta.id, 1)).run()
    return next
}
