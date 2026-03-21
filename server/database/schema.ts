import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import type { z } from 'zod'
import type { goalSchema } from '~~/shared/schemas/goal'

export const sessionMeta = sqliteTable('session_meta', {
    id: integer('id').primaryKey(),
    sessionVersion: integer('session_version').notNull().default(1),
})

type Goal = z.infer<typeof goalSchema>

export const categories = sqliteTable('categories', {
    id: text('id').primaryKey(),
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
    categoryId: text('category_id')
        .notNull()
        .references(() => categories.id, { onDelete: 'cascade' }),
    start: integer('start').notNull(),
    end: integer('end'),
    running: integer('running', { mode: 'boolean' }).notNull().default(false),
    comment: text('comment').notNull().default(''),
})

export type DbTable = typeof categories | typeof entries
export type CategoryRow = typeof categories.$inferSelect
export type EntryRow = typeof entries.$inferSelect
