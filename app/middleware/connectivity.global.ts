import { useConnectivity } from "~/composables/useConnectivity";

/**
 * Fires a fire-and-forget connectivity probe on every hard and soft
 * navigation. The probe is async; navigation never waits on it.
 */
export default defineNuxtRouteMiddleware(() => {
    if (import.meta.server || import.meta.prerender) return
    const { check } = useConnectivity()
    check()
})
