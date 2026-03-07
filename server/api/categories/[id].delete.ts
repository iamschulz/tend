import { categories } from '~~/server/database/schema'

/**
 * DELETE /api/categories/:id — Deletes a category and its entries (cascade). Returns 404 if not found.
 * @param event.params.id - The category UUID
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')!

    const db = useDb()
    const existing = db.select().from(categories).where(eq(categories.id, id)).get()
    if (!existing) {
        throw createError({ statusCode: 404, message: 'Category not found' })
    }

    db.delete(categories).where(eq(categories.id, id)).run()

    return { ok: true }
})
