import { z } from 'zod'
import { categorySchema } from './category'
import { entrySchema } from './entry'

export const categoryWithEntriesSchema = categorySchema.extend({
    entries: z.array(entrySchema).max(100_000),
    goals: categorySchema.shape.goals.optional(),
    hidden: categorySchema.shape.hidden.optional(),
    comment: categorySchema.shape.comment.optional(),
})

export const importDataSchema = z.object({
    categories: z.array(categoryWithEntriesSchema).max(500),
})
