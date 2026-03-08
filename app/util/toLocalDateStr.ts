/**
 * Formats a Date as a local-time YYYY-MM-DD string.
 * @param d - The date to format
 */
export const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
