/**
 * Rejects API requests whose body exceeds the configured limit.
 * Uses H3's readRawBody so the cached body stays available to downstream
 * handlers (readBody, readValidatedBody).
 * Set via NUXT_MAX_BODY_SIZE_MB (default: 5 MB).
 * @param event - The H3 request event
 */
export default defineEventHandler(async (event) => {
    if (!event.path.startsWith('/api/')) return

    const { maxBodySizeMb } = useRuntimeConfig()
    const maxBytes = Number(maxBodySizeMb) * 1024 * 1024

    // Fast path: reject immediately if the declared size already exceeds the limit.
    const contentLength = Number(getRequestHeader(event, 'content-length'))
    if (contentLength > maxBytes) {
        throw createError({ statusCode: 413, message: 'Request body too large' })
    }

    // Skip requests that declare no body.
    const isChunked = /\bchunked\b/i.test(event.node.req.headers['transfer-encoding'] ?? '')
    if (!contentLength && !isChunked) return

    // Read the body through H3 so it is properly cached for downstream handlers.
    const raw = await readRawBody(event, false)
    if (raw && raw.length > maxBytes) {
        throw createError({ statusCode: 413, message: 'Request body too large' })
    }
})
