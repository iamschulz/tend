import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import migration001 from './migrations/001-multi-user'
import migration002 from './migrations/002-api-tokens'
import migration003 from './migrations/003-days'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

/** Ordered list of migration functions. Each entry corresponds to a schema version (1-indexed). */
const migrations = [migration001, migration002, migration003]

/**
 * Returns the current schema version from the migrations table, or 0 if no migrations have run.
 * @param sqlite - The raw better-sqlite3 database instance
 */
function getSchemaVersion(sqlite: InstanceType<typeof Database>): number {
    const tableExists = sqlite
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`)
        .get()
    if (!tableExists) return 0
    const row = sqlite.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get() as
        | { version: number }
        | undefined
    return row?.version ?? 0
}

/**
 * Records a completed migration version in the schema_migrations table.
 * @param sqlite - The raw better-sqlite3 database instance
 * @param version - The migration version number to record
 */
function setSchemaVersion(sqlite: InstanceType<typeof Database>, version: number) {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)`)
    sqlite.prepare('INSERT OR REPLACE INTO schema_migrations (version) VALUES (?)').run(version)
}

/**
 * Opens the SQLite database, enables WAL mode and foreign keys, and runs pending migrations.
 * @param dbPath - Path to the SQLite database file
 */
export function initDatabase(dbPath: string) {
    const sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')

    _db = drizzle(sqlite, { schema })

    const currentVersion = getSchemaVersion(sqlite)

    for (let i = currentVersion; i < migrations.length; i++) {
        migrations[i]!(sqlite)
        setSchemaVersion(sqlite, i + 1)
    }

    return _db
}

/** Returns the initialized Drizzle database instance. Throws if called before init. */
export function getDatabase() {
    if (!_db) {
        throw new Error('Database not initialized. Make sure the database plugin has run.')
    }
    return _db
}
