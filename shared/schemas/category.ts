import { z } from 'zod'
import { activitySchema } from './activity'
import { goalSchema } from './goal'

/** Full category schema with required ID — used for import and internal references. */
export const categorySchema = z.object({
    id: z.uuid(),
    title: z.string().max(200),
    activity: activitySchema,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    goals: z.array(goalSchema),
    hidden: z.boolean(),
    comment: z.string().max(5000),
})

/**
 * Category creation schema — `id` is optional (server-generated if omitted).
 * The frontend provides its own UUID for optimistic updates; external API clients can omit it.
 */
export const categoryCreateSchema = categorySchema.omit({ id: true }).extend({ id: z.uuid().optional() })
