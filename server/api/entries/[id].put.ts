import { entryUpdateSchema } from '~~/shared/schemas/entry'
import { categories, entries } from '~~/server/database/schema'

/**
 * PUT /api/entries/:id — Partially updates an entry owned by the authenticated user.
 * Any subset of entry fields can be provided; only those fields are updated.
 * @param event - The H3 event (must be authenticated)
 * @param event.params.id - The entry UUID to update
 * @param event.body - Partial entry data validated against `entryUpdateSchema`
 * @returns The full updated entry
 * @throws 401 if not authenticated
 * @throws 404 if the entry does not belong to the user
 * @throws 404 if a new categoryId does not belong to the user
 * @throws 422 if the request body fails validation
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
