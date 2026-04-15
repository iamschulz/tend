import { users } from '~~/server/database/schema'

/**
 * DELETE /api/admin/users/:id — Deletes a user and all their data (cascades). Admin only.
 * Prevents deleting the last admin.
 * @param event.params.id - The user UUID
 */
export default defineEventHandler((event) => {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')!
    const db = useDb()

    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
        const adminCount = db.select().from(users).where(eq(users.role, 'admin')).all().length
        if (adminCount <= 1) {
            throw createError({ statusCode: 400, statusMessage: 'Cannot delete the last admin' })
        }
    }

    // Cascade: categories and entries are deleted via FK ON DELETE CASCADE
    db.delete(users).where(eq(users.id, id)).run()

    return { ok: true }
})
