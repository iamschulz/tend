import { z } from 'zod'

/**
 * Schema representing per-day user metadata (currently just free-form notes).
 * A `day` is keyed by the local calendar date string and scoped to the
 * authenticated user on the server.
 * @property date - ISO calendar date string (YYYY-MM-DD)
 * @property notes - Free-form user note for the day (max 10000 characters)
 */
export const daySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid date' }),
    notes: z.string().max(10000),
})

/**
 * Schema for the body of `PUT /api/days/:date`.
 * The `date` comes from the URL parameter, so only `notes` is sent in the body.
 * @property notes - Free-form user note for the day (max 10000 characters)
 */
export const dayUpdateSchema = daySchema.pick({ notes: true })

/**
 * Schema for validating the `:date` URL parameter on day endpoints.
 * @property date - ISO calendar date string (YYYY-MM-DD)
 */
export const dayDateParamSchema = daySchema.pick({ date: true })
