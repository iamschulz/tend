export const getIsoWeekString = (d: Date): string => {
    const date = new Date(d.getTime())
    const dayNum = date.getDay() || 7
    date.setDate(date.getDate() + 4 - dayNum)
    const yearStart = new Date(date.getFullYear(), 0, 1)
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
