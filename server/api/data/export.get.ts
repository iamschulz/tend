import { categories, entries, type EntryRow } from '~~/server/database/schema'

/** GET /api/data/export — Returns all data in the client-compatible import/export format. */
export default defineEventHandler(async () => {
    const db = useDb()
    const allCategories = db.select().from(categories).all()
    const allEntries = db.select().from(entries).all()

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
    }
})
