/**
 * Module-level state shared across all callers — there is only ever one
 * "current connectivity status" and one toast representing it.
 */
let inFlight: Promise<void> | null = null;
let lastShownType: 'offline' | 'serverUnreachable' | null = null;
let activeToastId: string | null = null;

const HEALTH_PATH = '/api/health';
const HEALTH_TIMEOUT_MS = 10000;

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
    const t = (key: string) => $i18n.t(key);
    const config = useRuntimeConfig();

    /** Run a single probe and reconcile the toast with the result. */
    async function probe(): Promise<void> {
        console.log('foo')
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

        if (activeToastId) {
            removeToast(activeToastId);
            activeToastId = null;
        }
        lastShownType = nextType

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
