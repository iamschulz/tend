import type { Activity } from '~/types/Activity'
import type { Entry } from '~/types/Entry'
import type { Goal } from '~/types/Goal'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'

export type ImportData = {
    categories: CategoryWithEntries[]
}

/**
 * Type guard for Activity objects.
 * @param value - The value to check
 */
function isActivity(value: unknown): value is Activity {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.title === 'string'
        && typeof obj.icon === 'string'
        && typeof obj.emoji === 'string'
}

/**
 * Type guard for Entry objects.
 * @param value - The value to check
 */
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
const validUnits = new Set(['event', 'minutes', 'hours', 'days'])

/**
 * Type guard for Goal objects.
 * @param value - The value to check
 */
function isGoal(value: unknown): value is Goal {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.count === 'number'
        && typeof obj.interval === 'string'
        && validIntervals.has(obj.interval)
        && typeof obj.unit === 'string'
        && validUnits.has(obj.unit)
        && typeof obj.days === 'number'
        && typeof obj.reminder === 'boolean'
}

/**
 * Type guard for CategoryWithEntries objects.
 * @param value - The value to check
 */
function isCategory(value: unknown): value is CategoryWithEntries {
    if (typeof value !== 'object' || value === null) { return false }
    const obj = value as Record<string, unknown>
    return typeof obj.id === 'string'
        && typeof obj.title === 'string'
        && isActivity(obj.activity)
        && typeof obj.color === 'string'
        && (obj.hidden === undefined || typeof obj.hidden === 'boolean')
        && (obj.comment === undefined || typeof obj.comment === 'string')
        && (obj.goals === undefined || (Array.isArray(obj.goals) && obj.goals.every(isGoal)))
        && Array.isArray(obj.entries)
        && obj.entries.every(isEntry)
}

/**
 * Validates that unknown data conforms to the ImportData shape.
 * @param data - The data to validate
 */
export function validateImportData(data: unknown): data is ImportData {
    if (typeof data !== 'object' || data === null) { return false }
    const obj = data as Record<string, unknown>
    return Array.isArray(obj.categories)
        && obj.categories.every(isCategory)
}
