/**
 * Logs every API request with method, path, IP address, and response status.
 * Runs after the response is sent so it captures the final status code.
 * @param event - The H3 request event
 */
export default defineEventHandler((event) => {
    if (!event.path.startsWith('/api/')) return

    const method = event.method
    const path = event.path
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    event.node.res.on('finish', () => {
        const status = event.node.res.statusCode
        console.log(`[audit] ${method} ${path} ${status} ip=${ip}`)
    })
})
