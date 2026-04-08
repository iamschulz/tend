import { categorySchema } from '~~/shared/schemas/category'
import { categories } from '~~/server/database/schema'

/**
 * POST /api/categories — Creates a new category owned by the authenticated user.
 * @param event.body - Category data validated against `categorySchema`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, categorySchema.parse)

    const db = useDb()
    db.insert(categories).values({
        id: body.id,
        userId,
        title: body.title,
        activityTitle: body.activity.title,
        activityIcon: body.activity.icon,
        activityEmoji: body.activity.emoji,
        color: body.color,
        goals: body.goals,
        hidden: body.hidden,
        comment: body.comment,
    }).run()

    return rowToCategory(db.select().from(categories).where(eq(categories.id, body.id)).get()!)
})
