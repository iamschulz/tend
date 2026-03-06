/**
 * Formats a Date as a UTC YYYY-MM-DD string.
 * @param d - The date to format
 */
export const toUtcDateStr = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
