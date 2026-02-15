export const getYearRange = (d: Date) => [
    new Date(Date.UTC(d.getUTCFullYear(), 0, 1)),
    new Date(Date.UTC(d.getUTCFullYear(), 11, 31, 23, 59, 59, 999))
] as const
