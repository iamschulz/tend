import { z } from 'zod'
import { activitySchema } from './activity'
import { goalSchema } from './goal'

export const categorySchema = z.object({
    id: z.uuid(),
    title: z.string().max(200),
    activity: activitySchema,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    goals: z.array(goalSchema),
    hidden: z.boolean(),
    comment: z.string().max(5000),
})

export const categoryCreateSchema = categorySchema.omit({ id: true })
