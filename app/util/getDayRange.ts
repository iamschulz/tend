export const getDayRange = (d: Date) => [
    new Date(d.getFullYear(), d.getMonth(), d.getDate()), 
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
] as const
