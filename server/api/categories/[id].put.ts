import { categoryCreateSchema } from '~~/shared/schemas/category'
import { categories } from '~~/server/database/schema'

const updateSchema = categoryCreateSchema.partial()

/**
 * PUT /api/categories/:id — Partially updates a category. Returns 404 if not found.
 * @param event.params.id - The category UUID
 * @param event.body - Partial category data validated against `categoryCreateSchema.partial()`
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')!
    const body = await readValidatedBody(event, updateSchema.parse)

    const db = useDb()
    const existing = db.select().from(categories).where(eq(categories.id, id)).get()
    if (!existing) {
        throw createError({ statusCode: 404, message: 'Category not found' })
    }

    const values: Record<string, unknown> = {}
    if (body.title !== undefined) values.title = body.title
    if (body.color !== undefined) values.color = body.color
    if (body.goals !== undefined) values.goals = body.goals
    if (body.hidden !== undefined) values.hidden = body.hidden
    if (body.comment !== undefined) values.comment = body.comment
    if (body.activity !== undefined) {
        values.activityTitle = body.activity.title
        values.activityIcon = body.activity.icon
        values.activityEmoji = body.activity.emoji
    }

    db.update(categories).set(values).where(eq(categories.id, id)).run()

    return rowToCategory(db.select().from(categories).where(eq(categories.id, id)).get()!)
})
