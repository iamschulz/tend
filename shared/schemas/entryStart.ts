import { z } from 'zod'

/**
 * Schema for the POST /api/entries/start request body.
 * @property categoryId - The UUID of the category to start a timer for
 * @property comment - Optional note for the entry (max 5000 characters)
 */
export const entryStartSchema = z.object({
    categoryId: z.uuid(),
    comment: z.string().max(5000).default(''),
})
