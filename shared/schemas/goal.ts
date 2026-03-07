import { z } from 'zod'

export const goalSchema = z.object({
    count: z.number(),
    interval: z.enum(['day', 'week', 'month']),
    unit: z.enum(['event', 'minutes', 'hours', 'days']),
    days: z.number(),
    reminder: z.boolean(),
})
