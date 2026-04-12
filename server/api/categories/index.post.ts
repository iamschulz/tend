import { randomUUID } from 'node:crypto'
import { categoryCreateSchema } from '~~/shared/schemas/category'
import { categories } from '~~/server/database/schema'

/**
 * POST /api/categories — Creates a new category owned by the authenticated user.
 * If no `id` is provided, the server generates one.
 * @param event - The H3 event (must be authenticated)
 * @param event.body - Category data validated against `categorySchema`
 * @returns The created category
 * @throws 401 if not authenticated
 * @throws 422 if the request body fails validation
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const body = await readValidatedBody(event, categoryCreateSchema.parse)

    const id = body.id ?? randomUUID()
    const db = useDb()

    // Transaction ensures the duplicate-check and insert are atomic.
    const created = db.transaction((tx) => {
        if (body.id) {
            const existing = tx.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).get()
            if (existing) {
                throw createError({ statusCode: 409, statusMessage: 'A category with this ID already exists' })
            }
        }

        tx.insert(categories).values({
            id,
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

        return rowToCategory(tx.select().from(categories).where(eq(categories.id, id)).get()!)
    })

    setResponseStatus(event, 201)
    return created
})
