// Nuxt injects dynamic inline scripts for payload hydration whose content
// varies per build, making static hash pinning impractical. 'unsafe-inline'
// is therefore required. External script origins remain blocked by 'self'.
// For strict inline-script control, replace this with the nuxt-security module
// which handles per-request nonces automatically.
const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    // Vue scoped styles and @nuxt/fonts face declarations are injected inline at runtime.
    "style-src 'self' 'unsafe-inline'",
    // @nuxt/fonts self-hosts Quicksand in production builds.
    "font-src 'self'",
    // SVG icons are inlined as data URIs.
    "img-src 'self' data:",
    // All API calls are same-origin; also required for the PWA service worker fetch.
    "connect-src 'self'",
    // PWA service worker.
    "worker-src 'self'",
    // Disallow plugins (Flash, etc.).
    "object-src 'none'",
    // Prevents <base> tag injection attacks.
    "base-uri 'self'",
    // OAuth redirects (Apple uses form POST callbacks). 'self' covers same-origin callbacks.
    "form-action 'self' https://accounts.google.com https://appleid.apple.com https://github.com",
    // Redundant with X-Frame-Options but enforced by CSP-aware browsers.
    "frame-ancestors 'none'",
].join('; ')

/**
 * Sets security headers on every response.
 * - Content-Security-Policy: restricts resource loading to trusted sources
 * - Permissions-Policy: disables browser features not used by this app
 * - X-Content-Type-Options: prevents MIME-type sniffing
 * - X-Frame-Options: blocks iframe embedding (clickjacking) for legacy browsers
 * - Referrer-Policy: limits URL information sent to external sites
 * @param event - The H3 request event
 */
export default defineEventHandler((event) => {
    if (import.meta.dev) return

    setResponseHeaders(event, {
        'Content-Security-Policy': CSP,
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
})
