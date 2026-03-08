/**
 * Returns the local-time start and end timestamps for the year containing the given date.
 * @param d - The date to get the year range for
 */
export const getYearRange = (d: Date) => [
    new Date(d.getFullYear(), 0, 1),
    new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
] as const
