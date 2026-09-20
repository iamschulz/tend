import type { Entry } from '~/types/Entry'

/**
 * Formats a date as the `YYYY-MM-DD` key entries are grouped by.
 * @param d - The date to format
 */
export function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Counts, per day, how many entries touch that day.
 *
 * An entry that runs past midnight counts on every day it covers rather than only on the
 * one it started on: it is time spent on that day, and a goal already counts it toward
 * every period it overlaps, so the graph would otherwise contradict the goal it feeds.
 *
 * A running entry has no end yet and is counted up to `now`. An entry that somehow ends
 * before it starts still counts on its start day rather than vanishing.
 *
 * @param entries - Entries to count, already filtered to the category in question
 * @param now - Current timestamp, used as the end of a running entry
 */
export function countEntriesByDate(entries: readonly Entry[], now: number = Date.now()): Map<string, number> {
    const counts = new Map<string, number>()

    for (const entry of entries) {
        const start = new Date(entry.start)
        const end = new Date(entry.end ?? now)
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
        const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

        do {
            const key = dateKey(day)
            counts.set(key, (counts.get(key) ?? 0) + 1)
            day.setDate(day.getDate() + 1)
        } while (day <= lastDay)
    }

    return counts
}
