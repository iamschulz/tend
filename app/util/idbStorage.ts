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
    /**
     * Reads a value from the in-memory cache.
     * @param key - The storage key
     */
    getItem(key: string): string | null {
        return cache.get(key) ?? null
    },

    /**
     * Writes a value to the cache and debounce-flushes it to IndexedDB.
     * @param key - The storage key
     * @param value - The value to store
     */
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

    /**
     * Removes a value from the cache and IndexedDB.
     * @param key - The storage key
     */
    removeItem(key: string): void {
        cache.delete(key)
        const existing = timers.get(key)
        if (existing) clearTimeout(existing)
        del(key).catch(() => {})
    },
}

/**
 * Pre-load IDB values into the cache. Must be called before Pinia hydrates.
 * @param keys - The storage keys to preload
 */
export async function preloadIdbCache(keys: string[]): Promise<void> {
    const results = await Promise.all(keys.map(k => get<string>(k)))
    for (let i = 0; i < keys.length; i++) {
        const value = results[i]
        if (value !== undefined) {
            cache.set(keys[i]!, value)
        }
    }
}
