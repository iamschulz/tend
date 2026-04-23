import { preloadIdbCache } from '~/util/idbStorage'

/**
 * Preloads the IndexedDB cache so pinia-plugin-persist can read it synchronously.
 * In server mode, actual data hydration is handled by app.vue's serverLoading watcher
 * to avoid SSR hydration mismatches.
 */
export default defineNuxtPlugin(async () => {
    await preloadIdbCache(['tend-categories', 'tend-entries', 'tend-days'])
})
