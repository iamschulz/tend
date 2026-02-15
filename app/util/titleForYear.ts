import type { TitleInfo } from './titleForDay'

export const titleForYear = (yearStr: string): TitleInfo | null => {
    const year = Number(yearStr)
    if (!Number.isFinite(year)) return null

    const short = yearStr
    const long = yearStr

    const prevLink = `/year/${year - 1}`

    const currentYear = new Date().getUTCFullYear()
    let nextLink: string | null = null
    if (year !== currentYear) {
        nextLink = `/year/${year + 1}`
    }

    return { short, long, prevLink, nextLink }
}
