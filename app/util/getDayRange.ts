/**
 * Returns the UTC start and end timestamps for a given day.
 * @param d - The date to get the range for
 */
export const getDayRange = (d: Date) => [
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
] as const
