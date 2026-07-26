import { watch } from 'vue'
import { initRejectedQueue, setOnEnqueued, pendingCount, hasPending } from '~/util/rejectedQueue'
import { onConnectivityRestored } from '~/composables/useConnectivity'

/**
 * Boots the offline rejected-queue sync (server mode only):
 * - loads any persisted pending mutations from IndexedDB
 * - re-hydrates (which drains the queue first) when connectivity is restored
 * - requests a Background Sync so the service worker can drain even when the
 *   app isn't open
 * - surfaces "N changes pending / syncing…" via a sticky toast
 */
export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    if (config.public.backendMode !== 'server') return

    await initRejectedQueue()

    const data = useDataStore()

    // On reconnect, re-hydrate. hydrateFromServer() drains the queue first, so
    // queued writes are replayed before the fresh server copy is pulled.
    onConnectivityRestored(() => { void data.hydrateFromServer() })

    // The connectivity probe only runs on navigation. Also react to the browser
    // `online` event so queued writes replay promptly even without a navigation.
    window.addEventListener('online', () => {
        if (hasPending()) void data.hydrateFromServer()
    })

    // Progressive enhancement: ask the service worker to drain in the background.
    setOnEnqueued(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
        if (!('SyncManager' in globalThis)) return
        navigator.serviceWorker.ready
            .then((reg) => (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync?.register('tend-rejected-queue'))
            .catch(() => { /* Background Sync unavailable — page-side drain still covers it */ })
    })

    // Surface pending state as a sticky toast that clears once fully synced.
    const { addToast, removeToast } = useToast()
    const { $i18n } = useNuxtApp()
    let toastId: string | null = null

    watch(pendingCount, (count) => {
        if (toastId) {
            removeToast(toastId)
            toastId = null
        }
        if (count > 0) {
            toastId = addToast($i18n.t('connectivity.pending', { count }), { duration: 0 })
        }
    })
})
