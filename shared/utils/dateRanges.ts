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
