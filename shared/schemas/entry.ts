import { z } from 'zod'

/**
 * Full entry schema including the server-generated ID.
 * @property id - UUID of the entry
 * @property start - Start timestamp in epoch milliseconds (UTC)
 * @property end - End timestamp in epoch milliseconds (UTC), or null if running
 * @property running - Whether the entry's timer is currently active
 * @property categoryId - UUID of the category this entry belongs to
 * @property comment - User note (max 5000 characters)
 */
export const entrySchema = z.object({
    id: z.uuid(),
    start: z.number(),
    end: z.number().nullable(),
    running: z.boolean(),
    categoryId: z.uuid(),
    comment: z.string().max(5000),
})

/** Entry schema without ID — used when the client creates an entry directly. */
export const entryCreateSchema = entrySchema.omit({ id: true })

/** Partial entry schema with required ID — used for PATCH-style updates. */
export const entryUpdateSchema = entrySchema.partial().required({ id: true })
