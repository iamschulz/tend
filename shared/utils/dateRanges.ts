/**
 * Returns the local-time start and end timestamps for a given day.
 * @param d - The date to get the range for
 * @returns A tuple of [start of day, end of day]
 */
export const getDayRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    return [start, end] as const
}

/**
 * Returns the local-time start (Monday) and end (Sunday) timestamps for the ISO week containing the given date.
 * @param d - The date to get the week range for
 * @returns A tuple of [start of Monday, end of Sunday]
 */
export const getWeekRange = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay() || 7

    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day + 1)
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999)

    return [startOfWeek, endOfWeek] as const
}

/**
 * Returns the local-time start and end timestamps for the month containing the given date.
 * @param d - The date to get the month range for
 * @returns A tuple of [first day of month, last day of month]
 */
export const getMonthRange = (d: Date) => [
    new Date(d.getFullYear(), d.getMonth(), 1),
    new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
] as const

/**
 * Returns the local-time start and end timestamps for the year containing the given date.
 * @param d - The date to get the year range for
 * @returns A tuple of [Jan 1, Dec 31]
 */
export const getYearRange = (d: Date) => [
    new Date(d.getFullYear(), 0, 1),
    new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
] as const

// --- UTC variants for server-side use ---
// These use UTC methods so that range boundaries are timezone-agnostic.
// Use these when filtering DB timestamps from an API date query parameter.

/**
 * Returns the UTC start and end timestamps (ms) for a given day.
 * @param d - The date to get the range for (interpreted as UTC)
 * @returns A tuple of [start of day UTC, end of day UTC]
 */
export const getDayRangeUTC = (d: Date) => [
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
] as const

/**
 * Returns the UTC start (Monday) and end (Sunday) timestamps (ms) for the ISO week containing the given date.
 * @param d - The date to get the week range for (interpreted as UTC)
 * @returns A tuple of [start of Monday UTC, end of Sunday UTC]
 */
export const getWeekRangeUTC = (d: Date) => {
    const day = d.getUTCDay() || 7
    const mondayDate = d.getUTCDate() - day + 1
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), mondayDate)
    const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), mondayDate + 6, 23, 59, 59, 999)
    return [start, end] as const
}

/**
 * Returns the UTC start and end timestamps (ms) for the month containing the given date.
 * @param d - The date to get the month range for (interpreted as UTC)
 * @returns A tuple of [first day of month UTC, last day of month UTC]
 */
export const getMonthRangeUTC = (d: Date) => [
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1),
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999),
] as const

/**
 * Returns the UTC start and end timestamps (ms) for the year containing the given date.
 * @param d - The date to get the year range for (interpreted as UTC)
 * @returns A tuple of [Jan 1 UTC, Dec 31 UTC]
 */
export const getYearRangeUTC = (d: Date) => [
    Date.UTC(d.getUTCFullYear(), 0, 1),
    Date.UTC(d.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
] as const
