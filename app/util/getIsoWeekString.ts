export const getIsoWeekString = (d: Date): string => {
    const date = new Date(d.getTime())
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
