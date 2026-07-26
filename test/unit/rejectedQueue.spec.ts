import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory stand-in for the idb-keyval store the rejected queue persists to.
const idb = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
    get: vi.fn(async (key: string) => idb.get(key)),
    set: vi.fn(async (key: string, value: unknown) => { idb.set(key, value) }),
}))

/** Build a $fetch-style rejection carrying an HTTP status. */
function httpError(status: number): Error {
    return Object.assign(new Error(`HTTP ${status}`), { response: { status } })
}

type RejectedQueue = typeof import('~/util/rejectedQueue')

/** Fresh module instance (module-level queue state reset) with a mock $fetch. */
async function loadQueue(fetchImpl: (...args: unknown[]) => unknown): Promise<RejectedQueue> {
    vi.resetModules()
    idb.clear()
    vi.stubGlobal('$fetch', vi.fn(fetchImpl))
    return import('~/util/rejectedQueue')
}

describe('rejectedQueue', () => {
    beforeEach(() => {
        idb.clear()
    })

    it('enqueues, persists to IDB, and tracks the pending count', async () => {
        const ob = await loadQueue(() => Promise.resolve())
        await ob.initRejectedQueue()

        expect(ob.hasPending()).toBe(false)
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })

        expect(ob.hasPending()).toBe(true)
        expect(ob.pendingCount.value).toBe(1)
        expect(idb.get('tend-rejected-queue')).toHaveLength(1)
    })

    it('restores a persisted queue on init', async () => {
        const ob = await loadQueue(() => Promise.resolve())
        idb.set('tend-rejected-queue', [{ id: 'o1', method: 'POST', url: '/api/entries', body: {}, ts: 1 }])
        await ob.initRejectedQueue()

        expect(ob.pendingCount.value).toBe(1)
        expect(ob.hasPending()).toBe(true)
    })

    it('drains ops FIFO and removes each on success', async () => {
        const calls: string[] = []
        const ob = await loadQueue((url: unknown) => { calls.push(url as string); return Promise.resolve() })
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })
        await ob.enqueue({ method: 'PUT', url: '/api/entries/e1', body: { end: 1 } })
        await ob.enqueue({ method: 'DELETE', url: '/api/entries/e1' })

        const emptied = await ob.drain()

        expect(emptied).toBe(true)
        expect(calls).toEqual(['/api/entries', '/api/entries/e1', '/api/entries/e1'])
        expect(ob.hasPending()).toBe(false)
        expect(idb.get('tend-rejected-queue')).toHaveLength(0)
    })

    it('treats 409 (duplicate id) as success', async () => {
        const ob = await loadQueue(() => Promise.reject(httpError(409)))
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })

        const emptied = await ob.drain()

        expect(emptied).toBe(true)
        expect(ob.hasPending()).toBe(false)
    })

    it('stops draining on a retryable 5xx and keeps the op', async () => {
        const ob = await loadQueue(() => Promise.reject(httpError(503)))
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })

        const emptied = await ob.drain()

        expect(emptied).toBe(false)
        expect(ob.hasPending()).toBe(true)
        expect(ob.pendingCount.value).toBe(1)
    })

    it('stops draining on a network error (no response)', async () => {
        const ob = await loadQueue(() => Promise.reject(new Error('Failed to fetch')))
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })

        expect(await ob.drain()).toBe(false)
        expect(ob.hasPending()).toBe(true)
    })

    it('drops a non-retryable 4xx and continues', async () => {
        let n = 0
        // First op fails with 422 (drop), second succeeds.
        const ob = await loadQueue(() => {
            n += 1
            return n === 1 ? Promise.reject(httpError(422)) : Promise.resolve()
        })
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/api/bad', body: {} })
        await ob.enqueue({ method: 'POST', url: '/api/entries', body: { id: 'e1' } })

        const emptied = await ob.drain()

        expect(emptied).toBe(true)
        expect(ob.hasPending()).toBe(false)
    })

    it('preserves FIFO order across a mid-drain failure', async () => {
        const calls: string[] = []
        let n = 0
        // op1 ok, op2 5xx (stop) — op2 and op3 must remain, in order.
        const ob = await loadQueue((url: unknown) => {
            calls.push(url as string)
            n += 1
            return n === 2 ? Promise.reject(httpError(500)) : Promise.resolve()
        })
        await ob.initRejectedQueue()
        await ob.enqueue({ method: 'POST', url: '/a' })
        await ob.enqueue({ method: 'PUT', url: '/b' })
        await ob.enqueue({ method: 'DELETE', url: '/c' })

        expect(await ob.drain()).toBe(false)
        expect(calls).toEqual(['/a', '/b'])
        expect((idb.get('tend-rejected-queue') as Array<{ url: string }>).map(o => o.url)).toEqual(['/b', '/c'])
    })
})
