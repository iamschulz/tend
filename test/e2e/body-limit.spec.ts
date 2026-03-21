import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import bcrypt from 'bcryptjs'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startServer, stopServer, getBaseUrl } from './_setup'

const dbPath = path.join(os.tmpdir(), `tend-body-limit-test-${Date.now()}.db`)
const LIMIT_MB = 1

describe('Body limit middleware', () => {
    beforeAll(async () => {
        await startServer({
            NUXT_PUBLIC_BACKEND_MODE: 'server',
            NUXT_SESSION_PASSWORD: 'test-session-secret-at-least-32-chars!!',
            NUXT_ADMIN_USERNAME: 'admin',
            NUXT_ADMIN_PASSWORD: await bcrypt.hash('password123', 4),
            NUXT_MAX_BODY_SIZE_MB: String(LIMIT_MB),
            NUXT_DB_PATH: dbPath,
        })
    })

    afterAll(() => {
        stopServer()
        fs.rmSync(dbPath, { force: true })
    })

    it('accepts a request within the limit', async () => {
        const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'wrong' }),
        })
        // Reaches the handler — wrong credentials, not a body-size rejection
        expect(res.status).toBe(401)
    })

    it('rejects when Content-Length header exceeds the limit', async () => {
        // Send a real oversized body so fetch sets Content-Length correctly.
        // The middleware rejects via the fast-path header check before reading any bytes.
        const overLimit = (LIMIT_MB * 1024 * 1024) + 1
        const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: Buffer.alloc(overLimit, 'x'),
        })
        expect(res.status).toBe(413)
    })

    it('rejects a streamed body that exceeds the limit without Content-Length', async () => {
        const overLimit = (LIMIT_MB * 1024 * 1024) + 1024
        const bigBuffer = Buffer.alloc(overLimit, 'x')
        let offset = 0

        // ReadableStream body causes fetch to omit Content-Length and use
        // chunked transfer encoding, so only the stream counter can catch it.
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                if (offset >= bigBuffer.length) {
                    controller.close()
                    return
                }
                const end = Math.min(offset + 64 * 1024, bigBuffer.length)
                controller.enqueue(bigBuffer.subarray(offset, end))
                offset = end
            },
        })

        const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            // @ts-expect-error duplex is required for streaming request bodies in Node.js fetch
            duplex: 'half',
            body: stream,
        })
        expect(res.status).toBe(413)
    })
})
