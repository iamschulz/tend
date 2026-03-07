import { z } from 'zod'

export const entrySchema = z.object({
    id: z.uuid(),
    start: z.number(),
    end: z.number().nullable(),
    running: z.boolean(),
    categoryId: z.uuid(),
    comment: z.string().max(5000),
})

export const entryCreateSchema = entrySchema.omit({ id: true })

export const entryUpdateSchema = entrySchema.partial().required({ id: true })
