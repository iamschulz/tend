/**
 * Sets security headers on every response.
 * - X-Content-Type-Options: prevents MIME-type sniffing
 * - X-Frame-Options: blocks embedding in iframes (clickjacking)
 * - Referrer-Policy: limits URL information sent to external sites
 * @param event - The H3 request event
 */
export default defineEventHandler((event) => {
    setResponseHeaders(event, {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
})
