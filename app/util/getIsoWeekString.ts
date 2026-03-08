/**
 * Returns the ISO week string (e.g. "2025-W01") for the given date's local day.
 * @param d - The date to get the ISO week string for
 */
export const getIsoWeekString = (d: Date): string => {
    // Project local date into UTC so the calculation is DST-safe
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
