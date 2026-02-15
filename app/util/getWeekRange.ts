export const getWeekRange = (d: Date) => {
    const date = new Date(d)
    const day = date.getUTCDay() || 7

    const startOfWeek = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1))
    const endOfWeek = new Date(Date.UTC(startOfWeek.getUTCFullYear(), startOfWeek.getUTCMonth(), startOfWeek.getUTCDate() + 6, 23, 59, 59, 999))

    return [startOfWeek, endOfWeek] as const
}
