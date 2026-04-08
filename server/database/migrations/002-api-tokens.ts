import type Database from 'better-sqlite3'

/**
 * Migration 002: Creates the api_tokens table for Bearer token authentication.
 * Tokens are stored as SHA-256 hashes — plaintext is never persisted.
 * @param sqlite - The raw better-sqlite3 database instance
 */
export default function migration002(sqlite: InstanceType<typeof Database>) {
    sqlite.exec(`
        CREATE TABLE api_tokens (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash      TEXT NOT NULL UNIQUE,
            label           TEXT NOT NULL,
            expires_at      INTEGER,
            created_at      INTEGER NOT NULL,
            last_used_at    INTEGER
        )
    `)
}
