import { categoryCreateSchema } from '~~/shared/schemas/category'
import { categories } from '~~/server/database/schema'

/**
 * POST /api/categories — Creates a new category. Generates a server-side UUID.
 * @param event.body - Category data validated against `categoryCreateSchema`
 */
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, categoryCreateSchema.parse)
    const id = crypto.randomUUID()

    const db = useDb()
    db.insert(categories).values({
        id,
        title: body.title,
        activityTitle: body.activity.title,
        activityIcon: body.activity.icon,
        activityEmoji: body.activity.emoji,
        color: body.color,
        goals: body.goals,
        hidden: body.hidden,
        comment: body.comment,
    }).run()

    return rowToCategory(db.select().from(categories).where(eq(categories.id, id)).get()!)
})
