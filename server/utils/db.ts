import { getDatabase } from '../database'

/** Re-exported Drizzle helpers, auto-imported in all server routes by Nitro. */
export { eq, and, sql } from 'drizzle-orm'

/** Returns the Drizzle database instance. Auto-imported in all server routes by Nitro. */
export function useDb() {
    return getDatabase()
}
