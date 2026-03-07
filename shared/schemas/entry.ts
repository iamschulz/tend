import { z } from 'zod'

export const entrySchema = z.object({
    id: z.string(),
    start: z.number(),
    end: z.number().nullable(),
    running: z.boolean(),
    categoryId: z.string(),
    comment: z.string(),
})

export const entryCreateSchema = entrySchema.omit({ id: true })

export const entryUpdateSchema = entrySchema.partial().required({ id: true })
