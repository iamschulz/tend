import { z } from 'zod'

/**
 * Schema for validating GET /api/entries query parameters.
 * Both fields are optional — if omitted, all entries for the user are returned.
 * If one is provided, both must be provided.
 * The `date` parameter is interpreted as **UTC** — e.g. `date=2026-04-10` covers
 * midnight-to-midnight UTC, not the caller's local timezone.
 * @property range - The time range type to filter by
 * @property date - An ISO date string (YYYY-MM-DD) interpreted as UTC
 */
export const entryQuerySchema = z.object({
    range: z.enum(['day', 'week', 'month', 'year']).optional(),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid date' })
        .optional(),
}).refine(
    (val) => (val.range === undefined) === (val.date === undefined),
    { message: 'Both "range" and "date" must be provided together, or neither' },
)
