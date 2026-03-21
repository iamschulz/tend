import type { EntryWithCategory } from '~/types/EntryWithCategory'

export type CategoryCount = { id: string; title: string; color: string; count: number }

/**
 * Counts entries per category.
 * @param entries - Entries with their associated category
 */
export function aggregateCategoryCounts(entries: EntryWithCategory[]): CategoryCount[] {
    const seen = new Map<string, CategoryCount>()
    for (const entry of entries) {
        if (entry.category) {
            const existing = seen.get(entry.category.id)
            if (existing) {
                existing.count++
            } else {
                seen.set(entry.category.id, {
                    id: entry.category.id,
                    title: entry.category.title,
                    color: entry.category.color,
                    count: 1,
                })
            }
        }
    }
    return [...seen.values()]
}
