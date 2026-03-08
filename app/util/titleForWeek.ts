import type { TranslateFunction } from '~/types/TranslateFunction'
import { getDateFromWeek } from './getDateFromWeek'
import { getIsoWeekString } from './getIsoWeekString'
import type { TitleInfo } from './titleForDay'

/**
 * Builds title and navigation links for a week view.
 * @param weekStr - ISO week string (e.g. "2025-W01")
 * @param t - Translation function
 * @param locale - The locale string for date formatting
 */
export const titleForWeek = (weekStr: string, t: TranslateFunction, locale: string): TitleInfo | null => {
    const monday = getDateFromWeek(weekStr)
    if (Number.isNaN(monday.getTime())) return null

    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const short = `${monday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
    const long = t('weekOf', { date: monday.toLocaleDateString(locale, { month: 'long', day: 'numeric' }) })

    const prevMonday = new Date(monday)
    prevMonday.setDate(prevMonday.getDate() - 7)
    const prevLink = `/week/${getIsoWeekString(prevMonday)}`

    const currentWeek = getIsoWeekString(new Date())
    let nextLink: string | null = null
    if (weekStr !== currentWeek) {
        const nextMonday = new Date(monday)
        nextMonday.setDate(nextMonday.getDate() + 7)
        nextLink = `/week/${getIsoWeekString(nextMonday)}`
    }

    return { short, long, prevLink, nextLink }
}
