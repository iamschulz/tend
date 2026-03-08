import type { TranslateFunction } from '~/types/TranslateFunction'
import { toLocalDateStr } from './toLocalDateStr'

export interface TitleInfo {
    short: string
    long: string
    prevLink: string | null
    nextLink: string | null
}

/**
 * Builds title and navigation links for a day view.
 * @param date - The day to build a title for
 * @param t - Translation function
 * @param locale - The locale string for date formatting
 */
export const titleForDay = (date: Date, t: TranslateFunction, locale: string): TitleInfo => {
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toLocalDateStr(yesterday)

    const dateStr = toLocalDateStr(date)

    const isToday = dateStr === todayStr
    const isYesterday = dateStr === yesterdayStr

    let short: string, long: string
    if (isToday) {
        short = t('today')
        long = t('today')
    } else if (isYesterday) {
        short = t('yesterday')
        long = t('yesterday')
    } else {
        short = date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
        long = date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
    }

    const prevDay = new Date(date)
    prevDay.setDate(prevDay.getDate() - 1)
    const prevLink = `/day/${toLocalDateStr(prevDay)}`

    let nextLink: string | null = null
    if (!isToday) {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        if (toLocalDateStr(nextDay) === todayStr) {
            nextLink = '/'
        } else {
            nextLink = `/day/${toLocalDateStr(nextDay)}`
        }
    }

    return { short, long, prevLink, nextLink }
}
