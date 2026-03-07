import { entries } from '~~/server/database/schema'

/** GET /api/entries — Returns all entries. */
export default defineEventHandler(async () => {
    const db = useDb()
    return db.select().from(entries).all()
})
