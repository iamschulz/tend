import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'
import type { goalSchema } from '~~/shared/schemas/goal'

export const sessionMeta = sqliteTable('session_meta', {
    id: integer('id').primaryKey(),
    sessionVersion: integer('session_version').notNull().default(1),
})

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash'),
    role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
    createdAt: integer('created_at').notNull(),
    lastLoginAt: integer('last_login_at'),
})

export const federatedCredentials = sqliteTable('federated_credentials', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
}, (table) => [
    uniqueIndex('idx_federated_provider_user').on(table.provider, table.providerUserId),
])

export const allowedEmails = sqliteTable('allowed_emails', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
})

type Goal = z.infer<typeof goalSchema>

export const categories = sqliteTable('categories', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    activityTitle: text('activity_title').notNull(),
    activityIcon: text('activity_icon').notNull(),
    activityEmoji: text('activity_emoji').notNull(),
    color: text('color').notNull(),
    goals: text('goals', { mode: 'json' })
        .notNull()
        .$type<Goal[]>()
        .default([]),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    comment: text('comment').notNull().default(''),
})

export const entries = sqliteTable('entries', {
    id: text('id').primaryKey(),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
        .notNull()
        .references(() => categories.id, { onDelete: 'cascade' }),
    start: integer('start').notNull(),
    end: integer('end'),
    running: integer('running', { mode: 'boolean' }).notNull().default(false),
    comment: text('comment').notNull().default(''),
})

export type DbTable = typeof categories | typeof entries
export type UserRow = typeof users.$inferSelect
export type FederatedCredentialRow = typeof federatedCredentials.$inferSelect
export type AllowedEmailRow = typeof allowedEmails.$inferSelect
export type CategoryRow = typeof categories.$inferSelect
export type EntryRow = typeof entries.$inferSelect
