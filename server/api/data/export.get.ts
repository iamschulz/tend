import { categories, entries } from '~~/server/database/schema'

/** GET /api/data/export — Returns all data in the client-compatible import/export format. */
export default defineEventHandler(async () => {
    const db = useDb()
    const allCategories = db.select().from(categories).all()
    const allEntries = db.select().from(entries).all()

    return {
        categories: allCategories.map((cat) => ({
            ...rowToCategory(cat),
            entries: allEntries
                .filter((e) => e.categoryId === cat.id)
                .map((e) => ({
                    id: e.id,
                    start: e.start,
                    end: e.end,
                    running: e.running,
                    categoryId: e.categoryId,
                    comment: e.comment,
                })),
        })),
    }
})
