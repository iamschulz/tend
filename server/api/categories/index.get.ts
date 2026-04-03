import { categories } from '~~/server/database/schema'

/** GET /api/categories — Returns all categories for the authenticated user. */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const db = useDb()
    const rows = db.select().from(categories).where(eq(categories.userId, userId)).all()
    return rows.map(rowToCategory)
})
