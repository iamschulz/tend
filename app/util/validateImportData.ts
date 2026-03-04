import type { Activity, Entry, CategoryWithEntries } from '~/types/Category'

export type ImportData = {
    categories: CategoryWithEntries[]
}

function isActivity(value: unknown): value is Activity {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.title === 'string'
        && typeof obj.icon === 'string'
        && typeof obj.emoji === 'string'
}

function isEntry(value: unknown): value is Entry {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.id === 'string'
        && typeof obj.start === 'number'
        && (obj.end === null || typeof obj.end === 'number')
        && typeof obj.running === 'boolean'
        && typeof obj.categoryId === 'string'
        && typeof obj.comment === 'string'
}

function isCategory(value: unknown): value is CategoryWithEntries {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.id === 'string'
        && typeof obj.title === 'string'
        && isActivity(obj.activity)
        && typeof obj.color === 'string'
        && (obj.hidden === undefined || typeof obj.hidden === 'boolean')
        && Array.isArray(obj.entries)
        && obj.entries.every(isEntry)
}

export function validateImportData(data: unknown): data is ImportData {
    if (typeof data !== 'object' || data === null) { return false }
    const obj = data as Record<string, unknown>
    return Array.isArray(obj.categories)
        && obj.categories.every(isCategory)
}
