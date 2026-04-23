import { z } from 'zod'
import crypto from 'node:crypto'
import { allowedEmails } from '~~/server/database/schema'

const inviteSchema = z.object({
    email: z.string().email(),
})

/**
 * POST /api/admin/invites — Adds an email to the allowlist. Admin only.
 * @param event.body.email - The email address to allow
 */
export default defineEventHandler(async (event) => {
    requireAdmin(event)

    const { email } = await readValidatedBody(event, inviteSchema.parse)
    const db = useDb()

    const existing = db.select().from(allowedEmails).where(eq(allowedEmails.email, email)).get()
    if (existing) {
        throw createError({ statusCode: 409, statusMessage: 'Email already on the allowlist' })
    }

    const id = crypto.randomUUID()
    db.insert(allowedEmails).values({
        id,
        email,
        invitedBy: requireUserId(event),
        createdAt: Date.now(),
    }).run()

    setResponseStatus(event, 201)
    return db.select().from(allowedEmails).where(eq(allowedEmails.id, id)).get()
})
