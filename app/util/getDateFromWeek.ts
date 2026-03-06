/**
 * Parses an ISO week string (e.g. "2025-W01") and returns the Monday of that week.
 * @param s - The ISO week string to parse
 */
export const getDateFromWeek = (s: string): Date => {
    const [year, week] = s.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(year || 0, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + ((week || 0) - 1) * 7)
    return monday
}
