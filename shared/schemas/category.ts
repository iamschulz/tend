import { z } from 'zod'
import { activitySchema } from './activity'
import { goalSchema } from './goal'

export const categorySchema = z.object({
    id: z.string(),
    title: z.string(),
    activity: activitySchema,
    color: z.string(),
    goals: z.array(goalSchema),
    hidden: z.boolean(),
    comment: z.string(),
})

export const categoryCreateSchema = categorySchema.omit({ id: true })
