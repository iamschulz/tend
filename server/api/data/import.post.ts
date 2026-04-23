import { randomUUID } from 'node:crypto'
import { importDataSchema } from '~~/shared/schemas/importData'
import { categories, entries, days } from '~~/server/database/schema'

/**
 * POST /api/data/import — Replaces the authenticated user's data. Wipes and re-inserts in a single transaction.
 * @param event.body - Full dataset validated against `importDataSchema`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, importDataSchema.parse)

    const db = useDb()

    // Wipe only this user's data and insert everything in a transaction
    db.transaction((tx) => {
        tx.delete(entries).where(eq(entries.userId, userId)).run()
        tx.delete(categories).where(eq(categories.userId, userId)).run()
        tx.delete(days).where(eq(days.userId, userId)).run()

        for (const cat of body.categories) {
            tx.insert(categories).values({
                id: cat.id,
                userId,
                title: cat.title,
                activityTitle: cat.activity.title,
                activityIcon: cat.activity.icon,
                activityEmoji: cat.activity.emoji,
                color: cat.color,
                goals: cat.goals ?? [],
                hidden: cat.hidden ?? false,
                comment: cat.comment ?? '',
            }).run()

            for (const entry of cat.entries) {
                tx.insert(entries).values({
                    id: entry.id,
                    userId,
                    categoryId: entry.categoryId,
                    start: entry.start,
                    end: entry.end,
                    running: entry.running,
                    comment: entry.comment,
                }).run()
            }
        }

        for (const day of body.days ?? []) {
            if (!day.notes) continue
            tx.insert(days).values({
                id: randomUUID(),
                userId,
                date: day.date,
                notes: day.notes,
            }).run()
        }
    })

    return { ok: true }
})
