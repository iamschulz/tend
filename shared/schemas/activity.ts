import { z } from 'zod'

export const activitySchema = z.object({
    title: z.string().max(200),
    icon: z.string().max(100),
    emoji: z.string().max(20),
})
