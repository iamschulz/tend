import { z } from 'zod'
import { users } from '~~/server/database/schema'

const updateSchema = z.object({
    role: z.enum(['admin', 'user']),
})

/**
 * PUT /api/admin/users/:id — Updates a user's role. Admin only.
 * Prevents removing the last admin.
 * @param event.params.id - The user UUID
 * @param event.body.role - The new role ('admin' | 'user')
 */
export default defineEventHandler(async (event) => {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')!
    const { role } = await readValidatedBody(event, updateSchema.parse)
    const db = useDb()

    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' })
    }

    // Prevent removing the last admin
    if (user.role === 'admin' && role === 'user') {
        const adminCount = db.select().from(users).where(eq(users.role, 'admin')).all().length
        if (adminCount <= 1) {
            throw createError({ statusCode: 400, message: 'Cannot remove the last admin' })
        }
    }

    db.update(users).set({ role }).where(eq(users.id, id)).run()

    return db
        .select({ id: users.id, email: users.email, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, id))
        .get()
})
