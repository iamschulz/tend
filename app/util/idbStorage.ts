import { set, get, del } from 'idb-keyval'

/**
 * A StorageLike adapter for pinia-plugin-persistedstate that uses IndexedDB
 * for durable storage while maintaining a synchronous in-memory cache for reads.
 * Writes are debounced and flushed to IndexedDB asynchronously.
 */

const cache = new Map<string, string>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

export const idbStorage = {
    getItem(key: string): string | null {
        return cache.get(key) ?? null
    },

    setItem(key: string, value: string): void {
        cache.set(key, value)

        const existing = timers.get(key)
        if (existing) clearTimeout(existing)

        timers.set(key, setTimeout(() => {
            set(key, value).catch(() => {
                // Silently handle IDB write failures
            })
            timers.delete(key)
        }, DEBOUNCE_MS))
    },

    removeItem(key: string): void {
        cache.delete(key)
        const existing = timers.get(key)
        if (existing) clearTimeout(existing)
        del(key).catch(() => {})
    },
}

/** Pre-load IDB values into the cache. Must be called before Pinia hydrates. */
export async function preloadIdbCache(keys: string[]): Promise<void> {
    const results = await Promise.all(keys.map(k => get<string>(k)))
    for (let i = 0; i < keys.length; i++) {
        const value = results[i]
        if (value !== undefined) {
            cache.set(keys[i]!, value)
        }
    }
}
