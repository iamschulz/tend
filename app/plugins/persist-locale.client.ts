import { set } from 'idb-keyval'
import type { Ref } from 'vue'

/**
 * Mirrors the active i18n locale into IndexedDB so the service worker can read
 * it when generating the dynamic web app manifest. Manifest fetches don't
 * reliably carry the i18n cookie, and the SW has no DOM/cookie access, so IDB
 * is the dependable channel.
 */
export default defineNuxtPlugin((nuxtApp) => {
    const i18n = nuxtApp.$i18n as { locale: Ref<string> }
    watch(
        i18n.locale,
        (locale) => { set('tend-locale', locale).catch(() => {}) },
        { immediate: true },
    )
})
