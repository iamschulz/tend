import { categories } from '~~/server/database/schema'

/** GET /api/categories — Returns all categories with nested activity objects. */
export default defineEventHandler(async () => {
    const db = useDb()
    const rows = db.select().from(categories).all()
    return rows.map(rowToCategory)
})
