/**
 * Simple in-memory rate limiter that tracks attempts by key (e.g. IP address).
 * Not shared across cluster workers — suitable for single-instance deployments.
 * @param maxAttempts - Maximum allowed attempts within the window
 * @param windowMs - Time window in milliseconds before the counter resets
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, { count: number; firstAttempt: number }>()

    return {
        /**
         * Check whether a key has exceeded the attempt limit within the window.
         * @param key - Identifier to rate-limit (e.g. IP address)
         */
        isLimited(key: string): boolean {
            const now = Date.now()
            const record = attempts.get(key)
            if (!record || now - record.firstAttempt > windowMs) {
                return false
            }
            return record.count >= maxAttempts
        },

        /**
         * Record a failed attempt for the given key.
         * @param key - Identifier to record against
         */
        recordFailure(key: string): void {
            const now = Date.now()
            const record = attempts.get(key)
            if (!record || now - record.firstAttempt > windowMs) {
                attempts.set(key, { count: 1, firstAttempt: now })
            } else {
                record.count++
            }
        },

        /**
         * Clear all recorded attempts for the given key.
         * @param key - Identifier to clear
         */
        clear(key: string): void {
            attempts.delete(key)
        },
    }
}
