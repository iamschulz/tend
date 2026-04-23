import { z } from 'zod'

/**
 * Schema for creating a new API token.
 * @property label - A user-chosen name for the token (1–100 printable characters)
 * @property expiresAt - Optional expiry as epoch milliseconds; must be in the future
 */
export const apiTokenCreateSchema = z.object({
    label: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[\x20-\x7E]+$/, 'Label must contain only printable ASCII characters'),
    expiresAt: z
        .number()
        .int()
        .positive()
        .optional()
        .refine(val => val === undefined || val > Date.now(), {
            message: 'Expiry must be in the future',
        }),
})
