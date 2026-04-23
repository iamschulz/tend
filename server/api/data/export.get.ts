import { categories, entries, days, type EntryRow } from '~~/server/database/schema'

/** GET /api/data/export — Returns the authenticated user's data in the import/export format. */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const db = useDb()
    const allCategories = db.select().from(categories).where(eq(categories.userId, userId)).all()
    const allEntries = db.select().from(entries).where(eq(entries.userId, userId)).all()
    const allDays = db
        .select({ date: days.date, notes: days.notes })
        .from(days)
        .where(eq(days.userId, userId))
        .all()

    const entryMap = new Map<string, EntryRow[]>()
    for (const e of allEntries) {
        const list = entryMap.get(e.categoryId)
        if (list) list.push(e)
        else entryMap.set(e.categoryId, [e])
    }

    return {
        categories: allCategories.map((cat) => ({
            ...rowToCategory(cat),
            entries: (entryMap.get(cat.id) ?? []).map((e) => ({
                id: e.id,
                start: e.start,
                end: e.end,
                running: e.running,
                categoryId: e.categoryId,
                comment: e.comment,
            })),
        })),
        days: allDays,
    }
})
