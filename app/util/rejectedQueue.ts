import { ref, readonly } from 'vue'
import { get, set } from 'idb-keyval'

/**
 * Durable queue of rejected server-mode mutations.
 *
 * Mutating API calls that fail while offline (or during a transient 5xx) are
 * appended here instead of being dropped, then replayed in FIFO order when
 * connectivity returns. The queue is persisted to IndexedDB (via idb-keyval,
 * the same dependency the persisted-state adapter uses) so it survives reloads.
 *
 * Replays are idempotent: creates use client-generated UUIDs and the API
 * returns 409 on a duplicate id, which we treat as success.
 */

/** A single rejected mutation awaiting replay. */
export interface RejectedOp {
    /** Client-generated op id - used for logging/debugging only. */
    id: string
    method: 'POST' | 'PUT' | 'DELETE'
    url: string
    body?: unknown
    /** Epoch ms the op was enqueued. */
    ts: number
}

const IDB_KEY = 'tend-rejected-queue'
/** Hard cap on queued ops; oldest are dropped past this to bound growth. */
const MAX_OPS = 500

/** In-memory source of truth, mirrored to IndexedDB on every mutation. */
let queue: RejectedOp[] = []
let initialized = false
let draining = false

/** Reactive count of pending ops for UI ("N changes pending / syncing…"). */
const pendingCountRef = ref(0)
export const pendingCount = readonly(pendingCountRef)

/**
 * Optional hook fired after {@link enqueue} so the caller can register a
 * Background Sync tag. Kept as an injectable seam to avoid importing
 * browser-only APIs into this module (also loaded by unit tests).
 */
let onEnqueued: (() => void) | null = null

/**
 * Registers a callback invoked whenever an op is enqueued. Used to request a
 * Background Sync so the service worker can drain even without the app open.
 * @param cb - Handler to run after each enqueue
 */
export function setOnEnqueued(cb: (() => void) | null): void {
    onEnqueued = cb
}

/** Persist the in-memory queue and keep the reactive count in sync. */
async function persist(): Promise<void> {
    pendingCountRef.value = queue.length
    await set(IDB_KEY, queue).catch(() => {
        // A failed IDB write only costs durability across reloads; the in-memory
        // queue still drives replay for this session.
    })
}

/**
 * Loads the persisted queue into memory. Must be called once on app start
 * before the first drain. Safe to call multiple times (no-op after the first).
 */
export async function initRejectedQueue(): Promise<void> {
    if (initialized) return
    initialized = true
    const stored = await get<RejectedOp[]>(IDB_KEY).catch(() => undefined)
    queue = Array.isArray(stored) ? stored : []
    pendingCountRef.value = queue.length
}

/** Whether any ops are waiting to be replayed. */
export function hasPending(): boolean {
    return queue.length > 0
}

/**
 * Appends a mutation to the queue and persists it. When the queue is at
 * capacity the oldest op is dropped (and warned about) to bound growth.
 * @param op - The mutation to enqueue (id/ts are filled in if omitted)
 */
export async function enqueue(op: Omit<RejectedOp, 'id' | 'ts'> & Partial<Pick<RejectedOp, 'id' | 'ts'>>): Promise<void> {
    const full: RejectedOp = {
        id: op.id ?? crypto.randomUUID(),
        method: op.method,
        url: op.url,
        body: op.body,
        ts: op.ts ?? Date.now(),
    }
    queue.push(full)
    if (queue.length > MAX_OPS) {
        const dropped = queue.length - MAX_OPS
        queue.splice(0, dropped)
        console.warn(`[rejectedQueue] exceeded ${MAX_OPS} ops; dropped ${dropped} oldest change(s).`)
    }
    await persist()
    onEnqueued?.()
}

/**
 * Classifies a $fetch error as retryable. Network failures (no response, e.g.
 * offline) and 5xx are retryable; 4xx are client errors that won't succeed on
 * replay. 409 is handled separately as success and never reaches here.
 * @param err - The rejected $fetch error
 */
function isRetryable(err: unknown): boolean {
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
        ?? (err as { statusCode?: number })?.statusCode
    if (status == null) return true // no response → network/offline
    return status >= 500
}

/**
 * Extract an HTTP status from a $fetch error, if any.
 * @param err - The rejected $fetch error
 */
function statusOf(err: unknown): number | undefined {
    return (err as { response?: { status?: number } })?.response?.status
        ?? (err as { statusCode?: number })?.statusCode
}

/**
 * Replays queued ops in FIFO order, removing each on success. Stops at the
 * first retryable failure (leaving that op and everything after it queued for
 * the next attempt). Non-retryable client errors drop the offending op and
 * continue. Concurrent drains are deduped.
 * @returns `true` if the queue was fully emptied, `false` if ops remain.
 */
export async function drain(): Promise<boolean> {
    if (draining) return !hasPending()
    draining = true
    try {
        while (queue.length > 0) {
            const op = queue[0]!
            try {
                await $fetch(op.url, { method: op.method, body: op.body as never })
            } catch (err) {
                const status = statusOf(err)
                if (status === 409) {
                    // Duplicate id - the create already landed. Treat as success.
                } else if (isRetryable(err)) {
                    return false // still offline / server down — try again later
                } else {
                    console.warn(`[rejectedQueue] dropping non-retryable ${op.method} ${op.url} (status ${status ?? '?'}):`, err)
                }
            }
            queue.shift()
            await persist()
        }
        return true
    } finally {
        draining = false
    }
}
