import { z } from 'zod'

export const activitySchema = z.object({
    title: z.string(),
    icon: z.string(),
    emoji: z.string(),
})
