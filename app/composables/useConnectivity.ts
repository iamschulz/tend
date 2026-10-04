/**
 * Module-level state shared across all callers — there is only ever one
 * "current connectivity status" and one toast representing it.
 */
let inFlight: Promise<void> | null = null;
let lastShownType: 'offline' | 'serverUnreachable' | null = null;
let activeToastId: string | null = null;

/** Handler fired when connectivity is restored (offline/unreachable → online). */
let restoredHandler: (() => void) | null = null;

const HEALTH_PATH = '/api/health';
const HEALTH_TIMEOUT_MS = 10000;

/**
 * Registers a callback invoked when connectivity is restored. Used to drain the
 * offline rejected queue and re-hydrate once the device is back online.
 * @param cb - Handler to run on recovery (pass null to clear)
 */
export function onConnectivityRestored(cb: (() => void) | null): void {
    restoredHandler = cb;
}

/**
 * Connectivity-toast helper.
 * Each call returns a `check()` function that, when invoked, runs at most one
 * connectivity probe at a time and shows / dismisses a sticky toast as the
 * status transitions between online / offline / server-unreachable.
 */
export function useConnectivity() {
    const { addToast, removeToast } = useToast();
    // useI18n() is restricted to setup context, but this composable is called
    // from a global route middleware. Reach for the i18n instance via the Nuxt
    // app, which is available anywhere Nuxt composables run.
    const { $i18n } = useNuxtApp();
    /**
     * translates a string.
     * 
     * @param key - The message.
     * @returns 
     */
    const t = (key: string) => $i18n.t(key);
    const config = useRuntimeConfig();

    /** Run a single probe and reconcile the toast with the result. */
    async function probe(): Promise<void> {
        let nextType: 'offline' | 'serverUnreachable' | null = null;

        if (!navigator.onLine) {
            nextType = 'offline';
        } else if (config.public.backendMode === 'server') {
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
                const res = await fetch(HEALTH_PATH, { signal: ctrl.signal, cache: 'no-store' });
                clearTimeout(timer)
                if (!res.ok) nextType = 'serverUnreachable';
            } catch {
                nextType = 'serverUnreachable';
            }
        }

        if (nextType === lastShownType) return;

        // Recovery: we were showing an offline/unreachable state and are now fine.
        const restored = lastShownType !== null && nextType === null;

        if (activeToastId) {
            removeToast(activeToastId);
            activeToastId = null;
        }
        lastShownType = nextType

        if (restored) restoredHandler?.();

        if (nextType === 'offline') {
            // duration: 0 keeps the toast visible until dismissed or the status recovers
            // a connectivity banner that disappears on its own would be misleading.
            activeToastId = addToast(t('connectivity.offline'), { duration: 0 })
        } else if (nextType === 'serverUnreachable') {
            activeToastId = addToast(t('connectivity.serverUnreachable'), { duration: 0 })
        }
    }

    /** Trigger a probe, deduping concurrent calls. */
    function check(): Promise<void> {
        if (inFlight) return inFlight
        inFlight = probe().finally(() => { inFlight = null })
        return inFlight
    }

    return { check }
}
