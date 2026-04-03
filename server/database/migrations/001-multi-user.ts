import type Database from 'better-sqlite3'
import crypto from 'node:crypto'

/**
 * v0 → v1: Creates the full schema with multi-user support.
 * For existing databases: migrates legacy single-user data to an admin user derived from env-var credentials.
 * For fresh databases: creates all tables from scratch.
 * @param sqlite - The raw better-sqlite3 database instance
 */
export default function migrate(sqlite: InstanceType<typeof Database>) {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS session_meta (
            id INTEGER PRIMARY KEY,
            session_version INTEGER NOT NULL DEFAULT 1
        );
        INSERT OR IGNORE INTO session_meta (id, session_version) VALUES (1, 1);

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            password_hash TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            created_at INTEGER NOT NULL,
            last_login_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS federated_credentials (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            provider_user_id TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_federated_provider_user ON federated_credentials(provider, provider_user_id);

        CREATE TABLE IF NOT EXISTS allowed_emails (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            invited_by TEXT REFERENCES users(id),
            created_at INTEGER NOT NULL
        );

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

    // Add user_id columns to existing tables (nullable for migration, enforced at app layer)
    const categoryCols = sqlite.prepare('PRAGMA table_info(categories)').all() as { name: string }[]
    if (!categoryCols.some((c) => c.name === 'user_id')) {
        sqlite.exec(`ALTER TABLE categories ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`)
    }

    const entryCols = sqlite.prepare('PRAGMA table_info(entries)').all() as { name: string }[]
    if (!entryCols.some((c) => c.name === 'user_id')) {
        sqlite.exec(`ALTER TABLE entries ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`)
    }

    // Migrate existing data: create an admin user from env vars and assign all data to them
    const hasData = sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
    const hasUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }

    if (hasData.count > 0 && hasUsers.count === 0) {
        const config = useRuntimeConfig()
        const adminId = crypto.randomUUID()
        const email = config.adminUsername ? `${config.adminUsername}@local` : 'admin@local'
        const name = config.adminUsername || 'Admin'
        const passwordHash = config.adminPassword || null

        sqlite
            .prepare('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(adminId, email, name, passwordHash, 'admin', Date.now())

        sqlite.prepare('UPDATE categories SET user_id = ? WHERE user_id IS NULL').run(adminId)
        sqlite.prepare('UPDATE entries SET user_id = ? WHERE user_id IS NULL').run(adminId)

        // Invalidate old sessions since the session shape changed
        sqlite.prepare('UPDATE session_meta SET session_version = session_version + 1 WHERE id = 1').run()

        console.log(`[tend] Migrated existing data to admin user "${name}" (${email})`)
    }

    sqlite.exec(`
        CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
        CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
    `)
}
