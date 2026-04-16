import type Database from 'better-sqlite3'

/**
 * Migration 003: Creates the `days` table for per-day user metadata (notes).
 * Each row is scoped to a user and a calendar date (YYYY-MM-DD).
 * A unique index on (user_id, date) enforces one row per user per day.
 * @param sqlite - The raw better-sqlite3 database instance
 */
export default function migration003(sqlite: InstanceType<typeof Database>) {
    sqlite.exec(`
        CREATE TABLE days (
            id       TEXT PRIMARY KEY,
            user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date     TEXT NOT NULL,
            notes    TEXT NOT NULL DEFAULT ''
        );
        CREATE UNIQUE INDEX idx_days_user_date ON days(user_id, date);
    `)
}
