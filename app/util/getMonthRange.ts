export const getMonthRange = (d: Date) => [
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))
] as const
