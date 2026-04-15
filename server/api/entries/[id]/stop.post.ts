import { entries, type EntryRow } from '~~/server/database/schema'

/**
 * POST /api/entries/:id/stop — Stops a running timed entry.
 * The server sets `end` to the current time; clients cannot forge timestamps.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.id - The UUID of the running entry to stop
 * @returns The updated entry with `running: false` and `end` set
 * @throws 404 if the entry does not belong to the user
 * @throws 409 if the entry is not currently running
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!

    const entry = findByIdAndUserOrThrow(entries, id, userId, 'Entry') as EntryRow

    if (!entry.running) {
        throw createError({ statusCode: 409, statusMessage: 'Entry is not running' })
    }

    const now = Date.now()
    const db = useDb()

    db.update(entries)
        .set({ end: now, running: false })
        .where(eq(entries.id, id))
        .run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
