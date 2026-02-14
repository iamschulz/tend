export const getYearRange = (d: Date) => [
    new Date(d.getFullYear(), 0, 1),
    new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
] as const
