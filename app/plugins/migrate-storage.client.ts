import { preloadIdbCache } from '~/util/idbStorage'

/**
 * Hydrates the data store on app start.
 * - Standalone mode: preloads from IndexedDB (existing behavior).
 * - Server mode: fetches from the API, falling back to IDB cache when offline.
 */
export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()

    // Always preload IDB — it serves as the offline cache in both modes
    await preloadIdbCache(['tend-categories', 'tend-entries'])

    if (config.public.backendMode === 'server') {
        const data = useDataStore()
        try {
            await data.hydrateFromServer()
        } catch (err) {
            // Offline or server unreachable — IDB cache is already loaded
            console.warn('[hydrate] Server unreachable, using local cache:', err)
        }
    }
})
