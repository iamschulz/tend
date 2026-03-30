import bcrypt from 'bcryptjs'

/**
 * Verifies a plaintext password against a bcrypt hash.
 * @param input - The plaintext password from the login request
 * @param hash - The bcrypt hash stored in NUXT_ADMIN_PASSWORD
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
