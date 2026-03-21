/**
 * Formats a Date as a local-time string for HTML5 datetime-local inputs.
 * @param date - The date to format
 * @returns String in "YYYY-MM-DDTHH:mm" format
 */
export const toDatetimeLocalStr = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}
