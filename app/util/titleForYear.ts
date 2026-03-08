import type { TitleInfo } from './titleForDay'

/**
 * Builds title and navigation links for a year view.
 * @param yearStr - Year string (e.g. "2025")
 */
export const titleForYear = (yearStr: string): TitleInfo | null => {
    const year = Number(yearStr)
    if (!Number.isFinite(year)) return null

    const short = yearStr
    const long = yearStr

    const prevLink = `/year/${year - 1}`

    const currentYear = new Date().getFullYear()
    let nextLink: string | null = null
    if (year !== currentYear) {
        nextLink = `/year/${year + 1}`
    }

    return { short, long, prevLink, nextLink }
}
