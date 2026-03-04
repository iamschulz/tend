import type { Activity } from '~/types/Activity'
import type { Entry } from '~/types/Entry'
import type { Goal } from '~/types/Goal'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'

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

const validIntervals = new Set(['day', 'week', 'month'])

function isGoal(value: unknown): value is Goal {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.count === 'number'
        && typeof obj.interval === 'string'
        && validIntervals.has(obj.interval)
        && typeof obj.days === 'number'
        && typeof obj.reminder === 'boolean'
}

function isCategory(value: unknown): value is CategoryWithEntries {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.id === 'string'
        && typeof obj.title === 'string'
        && isActivity(obj.activity)
        && typeof obj.color === 'string'
        && (obj.hidden === undefined || typeof obj.hidden === 'boolean')
        && (obj.goals === undefined || (Array.isArray(obj.goals) && obj.goals.every(isGoal)))
        && Array.isArray(obj.entries)
        && obj.entries.every(isEntry)
}

export function validateImportData(data: unknown): data is ImportData {
    if (typeof data !== 'object' || data === null) { return false }
    const obj = data as Record<string, unknown>
    return Array.isArray(obj.categories)
        && obj.categories.every(isCategory)
}
