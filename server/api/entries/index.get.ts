import { entries } from '~~/server/database/schema'

/** GET /api/entries — Returns all entries for the authenticated user. */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const db = useDb()
    return db.select().from(entries).where(eq(entries.userId, userId)).all()
})
