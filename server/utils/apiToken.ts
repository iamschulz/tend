import { randomBytes, createHash } from 'node:crypto'

/**
 * Generates a cryptographically random API token and its SHA-256 hash.
 * The plaintext is returned to show the user once; only the hash is stored.
 * @returns An object with `plaintext` (base64url, 64 chars) and `hash` (hex, 64 chars)
 */
export function generateApiToken(): { plaintext: string, hash: string } {
    const plaintext = randomBytes(48).toString('base64url')
    const hash = hashApiToken(plaintext)
    return { plaintext, hash }
}

/**
 * Computes the SHA-256 hash of an API token plaintext.
 * @param plaintext - The raw API token string
 * @returns The hex-encoded SHA-256 hash
 */
export function hashApiToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex')
}
