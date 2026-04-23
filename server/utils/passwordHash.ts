import bcrypt from 'bcryptjs'

/**
 * Hashes a plaintext password using bcrypt.
 * Named `bcryptHash` instead of `hashPassword` to avoid auto-import collision
 * with nuxt-auth-utils' scrypt-based `hashPassword`.
 * @param password - The plaintext password to hash
 * @returns The bcrypt hash
 */
export function bcryptHash(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 * @param input - The plaintext password from the login request
 * @param hash - The bcrypt hash to verify against
 * @returns True if the password matches the hash
 */
export function verifyPasswordHash(input: string, hash: string): Promise<boolean> {
    return bcrypt.compare(input, hash)
}

/**
 * Returns true if the given string looks like a bcrypt hash.
 * Used to give a helpful error when NUXT_ADMIN_PASSWORD is set to plaintext.
 * @param value - The value to check
 * @returns True if the value starts with a bcrypt version prefix
 */
export function isBcryptHash(value: string): boolean {
    return value.startsWith('$2')
}
