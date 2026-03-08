/**
 * Parses an ISO week string (e.g. "2025-W01") and returns local midnight on the Monday of that week.
 * @param s - The ISO week string to parse
 */
export const getDateFromWeek = (s: string): Date => {
    const [year, week] = s.split('-W').map(Number)
    // Calculate in UTC to avoid DST issues
    const jan4 = new Date(Date.UTC(year || 0, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + ((week || 0) - 1) * 7)
    // Return local midnight for the computed date
    return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())
}
