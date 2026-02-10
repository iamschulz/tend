export const getWeekRange = (d: Date) => {
    const date = new Date(d)
    const day = date.getDay() || 7 // Sunday (0) → 7

    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - day + 1)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return [startOfWeek, endOfWeek] as const
}
