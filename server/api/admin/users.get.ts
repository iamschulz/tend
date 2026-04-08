import { users } from '~~/server/database/schema'

/** GET /api/admin/users — Lists all users. Admin only. */
export default defineEventHandler((event) => {
    requireAdmin(event)

    const db = useDb()
    return db
        .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
            lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .all()
})
