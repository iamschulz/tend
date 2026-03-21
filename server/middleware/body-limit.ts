/**
 * Rejects API requests whose body exceeds the configured limit.
 * Enforces the limit on actual stream bytes, not just the Content-Length header,
 * which can be omitted or spoofed. Caches the accumulated body buffer on the
 * request so downstream handlers (readBody, readRawBody) do not re-read the stream.
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

    const req = event.node.req as typeof event.node.req & { rawBody?: Buffer }
    if (req.rawBody != null) return  // already cached by a prior read

    // Stream the body, counting bytes. Reject with 413 if the limit is exceeded.
    // Cache the result on req.rawBody so readBody/readRawBody return it without
    // re-reading the (now-consumed) stream.
    await new Promise<void>((resolve, reject) => {
        const chunks: Buffer[] = []
        let totalBytes = 0
        let settled = false

        /** @param err - If provided, rejects the promise with this error */
        const done = (err?: unknown) => {
            if (settled) return
            settled = true
            if (err) reject(err)
            else resolve()
        }

        req.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length
            if (totalBytes > maxBytes) {
                // Pause the stream so data events stop firing, but keep the socket
                // open so H3 can still write the 413 response back to the client.
                req.pause()
                done(createError({ statusCode: 413, message: 'Request body too large' }))
                return
            }
            chunks.push(chunk)
        })
        req.on('end', () => {
            req.rawBody = Buffer.concat(chunks)
            done()
        })
        req.on('error', (err) => done(err))
    })
})
