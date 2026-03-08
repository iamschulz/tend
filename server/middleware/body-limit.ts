/**
 * Rejects API requests whose Content-Length exceeds the configured limit.
 * Set via NUXT_MAX_BODY_SIZE_MB (default: 5 MB).
 * @param event - The H3 request event
 */
export default defineEventHandler((event) => {
    if (!event.path.startsWith('/api/')) return

    const { maxBodySizeMb } = useRuntimeConfig()
    const maxBytes = Number(maxBodySizeMb) * 1024 * 1024

    const contentLength = Number(getRequestHeader(event, 'content-length'))
    if (contentLength > maxBytes) {
        throw createError({ statusCode: 413, message: 'Request body too large' })
    }
})
