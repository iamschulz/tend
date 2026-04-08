import { allowedEmails } from '~~/server/database/schema'

/** GET /api/admin/invites — Lists all allowed emails. Admin only. */
export default defineEventHandler((event) => {
    requireAdmin(event)

    return useDb().select().from(allowedEmails).all()
})
