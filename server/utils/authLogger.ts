/**
 * Fail2ban-compatible authentication logger.
 *
 * Emits structured log lines that can be matched by a fail2ban filter regex.
 * Each line follows the format:
 *
 *   `[tend-auth] <result> ip=<ip> user=<user> path=<path>`
 *
 * Where `<result>` is one of:
 * - `authentication-failure` — bad credentials (login, change-password)
 * - `authentication-success` — valid credentials
 * - `registration-rejected` — registration denied (not on allowlist, duplicate email)
 * - `registration-success` — account created
 * - `rate-limited` — IP exceeded attempt limit
 *
 * Example fail2ban filter regex:
 *   `failregex = \[tend-auth\] (?:authentication-failure|registration-rejected|rate-limited) ip=<HOST>`
 */

type AuthResult =
    | 'authentication-failure'
    | 'authentication-success'
    | 'registration-rejected'
    | 'registration-success'
    | 'rate-limited'

/**
 * Strips control characters (newlines, tabs, etc.) from a string to prevent log injection.
 * @param value - The raw string to sanitize
 * @returns The sanitized string with control characters replaced by underscores
 */
export function sanitize(value: string): string {
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00-\x1F\x7F]/g, '_')
}

/**
 * Log an authentication event in a format parseable by fail2ban.
 * All parameters are sanitized to prevent log injection via newlines or control characters.
 * @param result - The outcome of the authentication attempt
 * @param ip - The client IP address (from X-Forwarded-For or direct connection)
 * @param user - The username or email submitted (use `'unknown'` if not available)
 * @param path - The request path (e.g. `/api/auth/login`)
 */
export function logAuthEvent(result: AuthResult, ip: string, user: string, path: string): void {
    console.log(`[tend-auth] ${result} ip=${sanitize(ip)} user=${sanitize(user)} path=${sanitize(path)}`)
}
