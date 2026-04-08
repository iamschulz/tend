import { categoryCreateSchema } from '~~/shared/schemas/category'
import { categories } from '~~/server/database/schema'

const updateSchema = categoryCreateSchema.partial()

/**
 * PUT /api/categories/:id — Partially updates a category owned by the authenticated user.
 * @param event.params.id - The category UUID
 * @param event.body - Partial category data validated against `categoryCreateSchema.partial()`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!
    const body = await readValidatedBody(event, updateSchema.parse)

    findByIdAndUserOrThrow(categories, id, userId, 'Category')

    const { activity, ...rest } = body
    const values: Record<string, unknown> = { ...rest }
    if (activity !== undefined) {
        values.activityTitle = activity.title
        values.activityIcon = activity.icon
        values.activityEmoji = activity.emoji
    }

    const db = useDb()
    db.update(categories).set(values).where(eq(categories.id, id)).run()

    return rowToCategory(db.select().from(categories).where(eq(categories.id, id)).get()!)
})
