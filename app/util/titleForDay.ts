import { toLocalDateStr } from './toLocalDateStr'

export interface TitleInfo {
    short: string
    long: string
    prevLink: string | null
    nextLink: string | null
}

export const titleForDay = (date: Date): TitleInfo => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    let short: string, long: string
    if (isToday) {
        short = 'Today'
        long = 'Today'
    } else if (isYesterday) {
        short = 'Yesterday'
        long = 'Yesterday'
    } else {
        short = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        long = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    }

    const prevDay = new Date(date)
    prevDay.setDate(prevDay.getDate() - 1)
    const prevLink = `/day/${toLocalDateStr(prevDay)}`

    let nextLink: string | null = null
    if (!isToday) {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)
        if (nextDay.toDateString() === today.toDateString()) {
            nextLink = '/'
        } else {
            nextLink = `/day/${toLocalDateStr(nextDay)}`
        }
    }

    return { short, long, prevLink, nextLink }
}
