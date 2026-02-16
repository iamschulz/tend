import type { TranslateFunction } from '~/types/TranslateFunction'
import { toUtcDateStr } from './toUtcDateStr'

export interface TitleInfo {
    short: string
    long: string
    prevLink: string | null
    nextLink: string | null
}

export const titleForDay = (date: Date, t: TranslateFunction, locale: string): TitleInfo => {
    const today = new Date()
    const todayUtc = today.toISOString().slice(0, 10)
    const yesterday = new Date(today)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayUtc = yesterday.toISOString().slice(0, 10)

    const dateUtc = date.toISOString().slice(0, 10)

    const isToday = dateUtc === todayUtc
    const isYesterday = dateUtc === yesterdayUtc

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
    prevDay.setUTCDate(prevDay.getUTCDate() - 1)
    const prevLink = `/day/${toUtcDateStr(prevDay)}`

    let nextLink: string | null = null
    if (!isToday) {
        const nextDay = new Date(date)
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)
        if (nextDay.toISOString().slice(0, 10) === todayUtc) {
            nextLink = '/'
        } else {
            nextLink = `/day/${toUtcDateStr(nextDay)}`
        }
    }

    return { short, long, prevLink, nextLink }
}
