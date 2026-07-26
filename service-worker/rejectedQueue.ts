import { idbRequest, txDone } from './idb'

/**
 * Service-worker-side replay of the rejected-mutation queue the page persists to
 * IndexedDB. Mirrors app/util/rejectedQueue.ts: same idb-keyval store/key and
 * the same 409-as-success / stop-on-5xx-or-network policy. Runs from a
 * Background Sync event so queued writes drain even when the app isn't open.
 *
 * The queue lives in the idb-keyval default store ('keyval-store'/'keyval')
 * under the 'tend-rejected-queue' key; IndexedDB is accessed directly since the
 * SW bundle doesn't carry idb-keyval.
 */

const KEYVAL_DB = 'keyval-store'
const KEYVAL_STORE = 'keyval'
const REJECTED_KEY = 'tend-rejected-queue'

/** A single queued mutation (subset of the page-side RejectedOp). */
interface RejectedOp {
  method: string
  url: string
  body?: unknown
}

/** Open the idb-keyval database (page owns the schema; never upgrade here). */
function openKeyvalDb(): Promise<IDBDatabase> {
  return idbRequest<IDBDatabase>(indexedDB.open(KEYVAL_DB))
}

/**
 * Read the persisted queue; empty if the store doesn't exist yet.
 * @param db - The open idb-keyval database
 */
async function readQueue(db: IDBDatabase): Promise<RejectedOp[]> {
  if (!db.objectStoreNames.contains(KEYVAL_STORE)) return []
  const tx = db.transaction(KEYVAL_STORE, 'readonly')
  const value = await idbRequest(tx.objectStore(KEYVAL_STORE).get(REJECTED_KEY))
  return Array.isArray(value) ? value : []
}

/**
 * Persist the queue back to the same store/key idb-keyval uses.
 * @param db - The open idb-keyval database
 * @param queue - The remaining ops to store
 */
function writeQueue(db: IDBDatabase, queue: RejectedOp[]): Promise<void> {
  const tx = db.transaction(KEYVAL_STORE, 'readwrite')
  tx.objectStore(KEYVAL_STORE).put(queue, REJECTED_KEY)
  return txDone(tx)
}

/**
 * Replay queued ops FIFO. 2xx/409/other-4xx remove the op (409 = duplicate id,
 * already stored; 4xx won't succeed on retry). 5xx or a network error stops the
 * drain, leaving the rest for the next attempt. Mirrors the page-side policy.
 */
export async function drainRejectedQueue(): Promise<void> {
  const db = await openKeyvalDb()
  try {
    let queue = await readQueue(db)
    while (queue.length > 0) {
      const op = queue[0]!
      try {
        const res = await fetch(op.url, {
          method: op.method,
          headers: op.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
          body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
          credentials: 'include',
        })
        if (!res.ok && res.status >= 500) break // retryable — stop
      } catch {
        break // network error — stop, retry on next sync
      }
      queue = queue.slice(1)
      await writeQueue(db, queue)
    }
  } finally {
    db.close()
  }
}
