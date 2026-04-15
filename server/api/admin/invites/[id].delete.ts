import { allowedEmails } from '~~/server/database/schema'

/**
 * DELETE /api/admin/invites/:id — Removes an email from the allowlist. Admin only.
 * @param event.params.id - The invite UUID
 */
export default defineEventHandler((event) => {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')!
    const db = useDb()

    const invite = db.select().from(allowedEmails).where(eq(allowedEmails.id, id)).get()
    if (!invite) {
        throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
    }

    db.delete(allowedEmails).where(eq(allowedEmails.id, id)).run()

    return { ok: true }
})
