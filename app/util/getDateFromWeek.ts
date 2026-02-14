export const getDateFromWeek = (s: string): Date => {
    const [year, week] = s.split('-W').map(Number)
    const jan4 = new Date((year || 0), 0, 4)
    const dayOfWeek = jan4.getDay() || 7
    const monday = new Date(jan4)
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + ((week || 0) - 1) * 7)
    return monday
}
