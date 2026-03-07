import { importDataSchema } from '~~/shared/schemas/importData'
import { categories, entries } from '~~/server/database/schema'

/**
 * POST /api/data/import — Replaces all data. Wipes and re-inserts in a single transaction.
 * @param event.body - Full dataset validated against `importDataSchema`
 */
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, importDataSchema.parse)

    const db = useDb()

    // Wipe existing data and insert everything in a transaction
    db.transaction((tx) => {
        tx.delete(entries).run()
        tx.delete(categories).run()

        for (const cat of body.categories) {
            tx.insert(categories).values({
                id: cat.id,
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
                    categoryId: entry.categoryId,
                    start: entry.start,
                    end: entry.end,
                    running: entry.running,
                    comment: entry.comment,
                }).run()
            }
        }
    })

    return { ok: true }
})
