import { toLocalDateStr } from './toLocalDateStr'
import type { TitleInfo } from './titleForDay'

/**
 * Builds title and navigation links for a month view.
 * @param monthStr - Month string in "YYYY-MM" format
 * @param locale - The locale string for date formatting
 */
export const titleForMonth = (monthStr: string, locale: string): TitleInfo | null => {
    const date = new Date(`${monthStr}-01T00:00:00`)
    if (Number.isNaN(date.getTime())) return null

    const short = date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
    const long = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

    const prevDate = new Date(date)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevLink = `/month/${toLocalDateStr(prevDate).slice(0, 7)}`

    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let nextLink: string | null = null
    if (monthStr !== currentMonth) {
        const nextDate = new Date(date)
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextLink = `/month/${toLocalDateStr(nextDate).slice(0, 7)}`
    }

    return { short, long, prevLink, nextLink }
}
