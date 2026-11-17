import type { RouteLocationNormalized } from 'vue-router'
import { toLocalDateStr } from '~/util/toLocalDateStr'

type Direction = 'backward' | 'forward'

const TIMEFRAMES = ['day', 'week', 'month', 'year'] as const

/**
 * Returns the timeframe kind and its sortable key (ISO-like date string) for a
 * route, or null if the route is not a timeframe page. `/` is today's day page.
 *
 * @param route - The new route.
 */
const timeframeOf = (route: RouteLocationNormalized) => {
    if (route.path === '/') return { kind: 'day', key: toLocalDateStr(new Date()) }

    const kind = TIMEFRAMES.find(tf => route.path.startsWith(`/${tf}/`))
    const date = route.params.date
    if (!kind || typeof date !== 'string' || !date) return null

    return { kind, key: date }
}

/**
 * Marks view transitions between two pages of the same timeframe kind
 * (day → day, week → week, …) with a direction, so CSS can slide the content
 * in from the side the user is navigating to. Other transitions are untouched.
 */
export default defineNuxtPlugin((nuxtApp) => {
    let pending: Direction | null = null
    let active: ViewTransition | null = null

    useRouter().beforeEach((to, from) => {
        const a = timeframeOf(from)
        const b = timeframeOf(to)
        // Keys are zero-padded ISO formats, so string comparison is chronological.
        pending = a && b && a.kind === b.kind && a.key !== b.key
            ? (b.key < a.key ? 'backward' : 'forward')
            : null
    })

    nuxtApp.hook('page:view-transition:start', (transition) => {
        const direction = pending
        pending = null
        const root = document.documentElement
        active = transition
        if (!direction) {
            delete root.dataset.timeframeNav
            return
        }

        root.dataset.timeframeNav = direction
        transition.finished.catch(() => {}).finally(() => {
            if (active === transition) delete root.dataset.timeframeNav
        })
    })
})
