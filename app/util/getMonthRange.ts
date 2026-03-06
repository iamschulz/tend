/**
 * Returns the UTC start and end timestamps for the month containing the given date.
 * @param d - The date to get the month range for
 */
export const getMonthRange = (d: Date) => [
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))
] as const
