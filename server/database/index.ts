import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function initDatabase(dbPath: string) {
    const sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')

    _db = drizzle(sqlite, { schema })

    // Create tables if they don't exist
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            activity_title TEXT NOT NULL,
            activity_icon TEXT NOT NULL,
            activity_emoji TEXT NOT NULL,
            color TEXT NOT NULL,
            goals TEXT NOT NULL DEFAULT '[]',
            hidden INTEGER NOT NULL DEFAULT 0,
            comment TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            start INTEGER NOT NULL,
            "end" INTEGER,
            running INTEGER NOT NULL DEFAULT 0,
            comment TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_entries_category_id ON entries(category_id);
    `)

    return _db
}

export function getDatabase() {
    if (!_db) {
        throw new Error('Database not initialized. Make sure the database plugin has run.')
    }
    return _db
}
