/**
 * Returns the local-time start and end timestamps for a given day.
 * @param d - The date to get the range for
 */
export const getDayRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
    return [start, end] as const
}
