import { toUtcDateStr } from './toUtcDateStr'
import type { TitleInfo } from './titleForDay'

export const titleForMonth = (monthStr: string): TitleInfo | null => {
    const date = new Date(`${monthStr}-01`)
    if (Number.isNaN(date.getTime())) return null

    const short = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    const long = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

    const prevDate = new Date(date)
    prevDate.setUTCMonth(prevDate.getUTCMonth() - 1)
    const prevLink = `/month/${toUtcDateStr(prevDate).slice(0, 7)}`

    const now = new Date()
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    let nextLink: string | null = null
    if (monthStr !== currentMonth) {
        const nextDate = new Date(date)
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1)
        nextLink = `/month/${toUtcDateStr(nextDate).slice(0, 7)}`
    }

    return { short, long, prevLink, nextLink }
}
