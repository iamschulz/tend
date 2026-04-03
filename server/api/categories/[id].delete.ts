import { categories } from '~~/server/database/schema'

/**
 * DELETE /api/categories/:id — Deletes a category owned by the authenticated user (cascades to entries).
 * @param event.params.id - The category UUID
 */
export default defineEventHandler(async (event) => {
    const userId = requireUserId(event)
    const id = getRouterParam(event, 'id')!
    findByIdAndUserOrThrow(categories, id, userId, 'Category')

    useDb().delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).run()

    return { ok: true }
})
