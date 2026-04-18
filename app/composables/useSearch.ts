import type { Day } from '~/types/Day'
import type { EntryWithCategory } from '~/types/EntryWithCategory'

export const SEARCH_PAGE_SIZE = 50

export type EntryResult = {
    kind: 'entry'
    key: string
    sortKey: number
    entry: EntryWithCategory
}

export type DayResult = {
    kind: 'day'
    key: string
    sortKey: number
    day: Day
}

export type SearchResult = EntryResult | DayResult

/**
 * Reads search params from the current route, fetches matching day notes
 * (server-side in server mode, in-memory in local mode), and exposes
 * reactive filtered/sorted/paginated results. Days are scored at local
 * midnight so they precede entries on the same date.
 */
export function useSearch() {
    const route = useRoute()
    const { locale } = useI18n()
    const data = useDataStore()

    const query = computed(() => {
        const q = route.query.q
        return (typeof q === 'string' ? q : '').trim()
    })

    const includeEntries = computed(() => route.query.events !== '0')
    const includeDays = computed(() => route.query.days !== '0')

    const page = computed(() => {
        const raw = Number(route.query.page)
        return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1
    })

    const matchingDays = ref<Day[]>([])
    const loadingDays = ref(false)

    // Sequence counter so a slow earlier fetch can't overwrite a newer one.
    let requestSeq = 0
    watch(
        [query, includeDays],
        async ([q, include]) => {
            const seq = ++requestSeq
            if (!q || !include) {
                matchingDays.value = []
                return
            }
            loadingDays.value = true
            try {
                const result = await data.searchDays(q)
                if (seq === requestSeq) matchingDays.value = result
            } finally {
                if (seq === requestSeq) loadingDays.value = false
            }
        },
        { immediate: true },
    )

    const nuxtApp = useNuxtApp()
    const hydrated = ref(import.meta.client && !nuxtApp.isHydrating)
    onNuxtReady(() => {
        hydrated.value = true
    })

    const mounted = computed(() => hydrated.value && !loadingDays.value)

    const results = computed<SearchResult[]>(() => {
        const needle = query.value.toLocaleLowerCase(locale.value)
        if (!needle) return []

        const out: SearchResult[] = []

        if (includeEntries.value) {
            for (const entry of data.getAllEntries) {
                const title = (entry.category?.title ?? '').toLocaleLowerCase(locale.value)
                const comment = (entry.comment ?? '').toLocaleLowerCase(locale.value)
                if (title.includes(needle) || comment.includes(needle)) {
                    out.push({
                        kind: 'entry',
                        key: `e-${entry.id}`,
                        sortKey: entry.start,
                        entry,
                    })
                }
            }
        }

        if (includeDays.value) {
            for (const day of matchingDays.value) {
                // Re-check locally — server uses ASCII LIKE, so it may return
                // false positives for non-ASCII queries (e.g. German ß vs SS).
                if (!day.notes.toLocaleLowerCase(locale.value).includes(needle)) continue
                const [y, m, d] = day.date.split('-').map(Number)
                const sortKey = new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime()
                out.push({
                    kind: 'day',
                    key: `d-${day.date}`,
                    sortKey,
                    day,
                })
            }
        }

        out.sort((a, b) => b.sortKey - a.sortKey)
        return out
    })

    const totalPages = computed(() =>
        Math.max(1, Math.ceil(results.value.length / SEARCH_PAGE_SIZE)),
    )

    const pageResults = computed(() => {
        const start = (page.value - 1) * SEARCH_PAGE_SIZE
        return results.value.slice(start, start + SEARCH_PAGE_SIZE)
    })

    /** @param n - The target page number */
    function pageLink(n: number) {
        return {
            path: '/search',
            query: {
                q: query.value,
                events: includeEntries.value ? '1' : '0',
                days: includeDays.value ? '1' : '0',
                page: String(n),
            },
        }
    }

    return {
        query,
        includeEntries,
        includeDays,
        page,
        mounted,
        results,
        pageResults,
        totalPages,
        pageLink,
    }
}
