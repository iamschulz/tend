/**
 * Tiny promise wrappers over the raw IndexedDB event API, for service-worker
 * code that can't pull in idb-keyval the way the page does.
 */

/**
 * Resolve when an IDBRequest succeeds (rejects on error).
 * @param req - The IndexedDB request to await
 */
export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', () => resolve(req.result))
    req.addEventListener('error', () => reject(req.error))
  })
}

/**
 * Resolve when an IDB transaction completes (rejects on error/abort).
 * @param tx - The transaction to await
 */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.addEventListener('complete', () => resolve())
    tx.addEventListener('error', () => reject(tx.error))
    tx.addEventListener('abort', () => reject(tx.error))
  })
}
