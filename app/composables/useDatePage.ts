/**
 * Shared boilerplate for date-based pages (day, week, month, year).
 * Handles the `mounted` ref, `onNuxtReady`, and `ui.setCurrentViewDate`.
 * @param date - The resolved date for the current view
 */
export function useDatePage(date: Date) {
    const ui = useUiStore()
    ui.setCurrentViewDate(date)

    const nuxtApp = useNuxtApp()
    const mounted = ref(import.meta.client && !nuxtApp.isHydrating)

    onNuxtReady(() => {
        mounted.value = true
    })

    return { mounted }
}
