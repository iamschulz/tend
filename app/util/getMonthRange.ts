export const getMonthRange = (d: Date) => [
    new Date(d.getFullYear(), d.getMonth(), 1),
    new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
] as const
