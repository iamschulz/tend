import { toLocalDateStr } from './toLocalDateStr'
import type { TitleInfo } from './titleForDay'

export const titleForMonth = (monthStr: string): TitleInfo | null => {
    const date = new Date(`${monthStr}-01`)
    if (Number.isNaN(date.getTime())) return null

    const short = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    const long = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

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
