import { entryUpdateSchema } from '~~/shared/schemas/entry'
import { categories, entries } from '~~/server/database/schema'

/**
 * PUT /api/entries/:id — Partially updates an entry owned by the authenticated user.
 * @param event.params.id - The entry UUID
 * @param event.body - Partial entry data validated against `entryUpdateSchema`
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!
    const body = await readValidatedBody(event, entryUpdateSchema.parse)

    findByIdAndUserOrThrow(entries, id, userId, 'Entry')

    // If categoryId is being changed, verify the target category belongs to this user
    if (body.categoryId) {
        findByIdAndUserOrThrow(categories, body.categoryId, userId, 'Category')
    }

    const db = useDb()
    db.update(entries).set(body).where(eq(entries.id, id)).run()

    return db.select().from(entries).where(eq(entries.id, id)).get()!
})
