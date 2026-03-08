/**
 * Returns the local-time start (Monday) and end (Sunday) timestamps for the ISO week containing the given date.
 * @param d - The date to get the week range for
 */
export const getWeekRange = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay() || 7

    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day + 1)
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999)

    return [startOfWeek, endOfWeek] as const
}
