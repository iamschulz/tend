import type { TranslateFunction } from '~/types/TranslateFunction'
import { getDateFromWeek } from './getDateFromWeek'
import { getIsoWeekString } from './getIsoWeekString'
import type { TitleInfo } from './titleForDay'

export const titleForWeek = (weekStr: string, t: TranslateFunction, locale: string): TitleInfo | null => {
    const monday = getDateFromWeek(weekStr)
    if (Number.isNaN(monday.getTime())) return null

    const sunday = new Date(monday.getTime() + 6 * 86400000)
    const short = `${monday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
    const long = t('weekOf', { date: monday.toLocaleDateString(locale, { month: 'long', day: 'numeric' }) })

    const prevMonday = new Date(monday)
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7)
    const prevLink = `/week/${getIsoWeekString(prevMonday)}`

    const currentWeek = getIsoWeekString(new Date())
    let nextLink: string | null = null
    if (weekStr !== currentWeek) {
        const nextMonday = new Date(monday)
        nextMonday.setUTCDate(nextMonday.getUTCDate() + 7)
        nextLink = `/week/${getIsoWeekString(nextMonday)}`
    }

    return { short, long, prevLink, nextLink }
}
