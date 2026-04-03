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

    // First user becomes admin automatically
    const userCount = db.select().from(users).all().length
    const isFirstUser = userCount === 0

    if (!isFirstUser) {
        // Check allowlist
        const allowed = db.select().from(allowedEmails).where(eq(allowedEmails.email, email)).get()
        if (!allowed) {
            throw createError({ statusCode: 403, statusMessage: 'Registration not allowed' })
        }
        // Remove from allowlist after use
        db.delete(allowedEmails).where(eq(allowedEmails.id, allowed.id)).run()
    }

    // Create user
    const userId = crypto.randomUUID()
    db.insert(users).values({
        id: userId,
        email,
        name,
        role: isFirstUser ? 'admin' : 'user',
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
    }).run()

    // Link federated credential
    db.insert(federatedCredentials).values({
        id: crypto.randomUUID(),
        userId,
        provider,
        providerUserId,
    }).run()

    if (isFirstUser) {
        console.log(`[tend] First user "${name}" (${email}) registered as admin via ${provider}`)
    }

    await setUserSession(event, {
        user: { id: userId, email, name, role: isFirstUser ? 'admin' : 'user' },
        sessionVersion: getSessionVersion(),
    })

    return sendRedirect(event, '/')
}
