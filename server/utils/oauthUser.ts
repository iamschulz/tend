import type { H3Event } from 'h3'
import crypto from 'node:crypto'
import { users, federatedCredentials, allowedEmails } from '~~/server/database/schema'
import { getSessionVersion } from '~~/server/utils/sessionVersion'

/**
 * Finds or creates a user from an OIDC provider callback, then sets the session.
 * - If a federated credential exists for this provider+sub, logs in the existing user.
 * - If the users table is empty, creates the first user as admin (bootstrap).
 * - Otherwise, checks the allowed_emails list before creating a new user.
 * @param event - The H3 request event
 * @param provider - The OIDC provider name (e.g. 'google', 'apple')
 * @param providerUserId - The `sub` claim from the OIDC token
 * @param email - The user's email from the OIDC profile
 * @param name - The user's display name from the OIDC profile
 */
export async function findOrCreateOAuthUser(
    event: H3Event,
    provider: string,
    providerUserId: string,
    email: string,
    name: string,
) {
    const db = useDb()

    // Check for existing federated credential
    const existing = db
        .select()
        .from(federatedCredentials)
        .where(and(eq(federatedCredentials.provider, provider), eq(federatedCredentials.providerUserId, providerUserId)))
        .get()

    if (existing) {
        const user = db.select().from(users).where(eq(users.id, existing.userId)).get()
        if (!user) {
            throw createError({ statusCode: 500, statusMessage: 'Linked user not found' })
        }

        db.update(users).set({ lastLoginAt: Date.now() }).where(eq(users.id, user.id)).run()

        await setUserSession(event, {
            user: { id: user.id, email: user.email, name: user.name, role: user.role as 'admin' | 'user' },
            sessionVersion: getSessionVersion(),
        })

        return sendRedirect(event, '/')
    }

    // Transaction prevents race conditions (e.g. two concurrent OAuth callbacks
    // both seeing zero users and both becoming admin)
    const result = db.transaction((tx) => {
        const isFirstUser = tx.select().from(users).all().length === 0

        if (!isFirstUser) {
            const allowed = tx.select().from(allowedEmails).where(eq(allowedEmails.email, email)).get()
            if (!allowed) {
                throw createError({ statusCode: 403, statusMessage: 'Registration not allowed' })
            }
            tx.delete(allowedEmails).where(eq(allowedEmails.id, allowed.id)).run()
        }

        const userId = crypto.randomUUID()
        const role = isFirstUser ? 'admin' as const : 'user' as const

        tx.insert(users).values({
            id: userId,
            email,
            name,
            role,
            createdAt: Date.now(),
            lastLoginAt: Date.now(),
        }).run()

        tx.insert(federatedCredentials).values({
            id: crypto.randomUUID(),
            userId,
            provider,
            providerUserId,
        }).run()

        if (isFirstUser) {
            console.log(`[tend] First user registered as admin via ${provider}`)
        }

        return { userId, role }
    })

    await setUserSession(event, {
        user: { id: result.userId, email, name, role: result.role },
        sessionVersion: getSessionVersion(),
    })

    return sendRedirect(event, '/')
}
