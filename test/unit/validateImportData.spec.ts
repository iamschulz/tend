import { describe, it, expect } from 'vitest'
import { validateImportData } from '~/util/validateImportData'
import { generateSeedData } from '../../scripts/generate-seed-data'

const CAT_ID = '00000000-0000-4000-8000-000000000001'
const ENTRY_ID = '00000000-0000-4000-8000-000000000002'

const validEntry = {
    id: ENTRY_ID,
    start: 1000,
    end: 2000,
    running: false,
    categoryId: CAT_ID,
    comment: '',
}

const validActivity = { title: 'Work', icon: 'briefcase', emoji: '💼' }

const validCategory = {
    id: CAT_ID,
    title: 'Work',
    activity: validActivity,
    color: '#ff0000',
    hidden: false,
    entries: [validEntry],
}

describe('validateImportData', () => {
    describe('top-level structure', () => {
        it('returns true for valid data with one category', () => {
            expect(validateImportData({ categories: [validCategory] })).toBe(true)
        })

        it('returns true for valid data with multiple categories', () => {
            const second = { ...validCategory, id: '00000000-0000-4000-8000-000000000003', title: 'Play', entries: [] }
            expect(validateImportData({ categories: [validCategory, second] })).toBe(true)
        })

        it('returns true for empty categories array', () => {
            expect(validateImportData({ categories: [] })).toBe(true)
        })

        it('rejects more than 500 categories', () => {
            const categories = Array.from({ length: 501 }, (_, i) => ({
                ...validCategory,
                id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
                entries: [],
            }))
            expect(validateImportData({ categories })).toBe(false)
        })

        it('rejects more than 100000 entries per category', () => {
            const entries = Array.from({ length: 100_001 }, (_, i) => ({
                ...validEntry,
                id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            }))
            expect(validateImportData({
                categories: [{ ...validCategory, entries }],
            })).toBe(false)
        })

        it('returns false for null', () => {
            expect(validateImportData(null)).toBe(false)
        })

        it('returns false for undefined', () => {
            expect(validateImportData(undefined)).toBe(false)
        })

        it('returns false for a string', () => {
            expect(validateImportData('hello')).toBe(false)
        })

        it('returns false for a number', () => {
            expect(validateImportData(42)).toBe(false)
        })

        it('returns false for an array', () => {
            expect(validateImportData([validCategory])).toBe(false)
        })

        it('returns false for missing categories key', () => {
            expect(validateImportData({})).toBe(false)
        })

        it('returns false when categories is not an array', () => {
            expect(validateImportData({ categories: 'not-array' })).toBe(false)
        })

        it('returns false when categories is an object', () => {
            expect(validateImportData({ categories: { 0: validCategory } })).toBe(false)
        })
    })

    describe('category validation', () => {
        it('returns false when category is null', () => {
            expect(validateImportData({ categories: [null] })).toBe(false)
        })

        it('returns false when category id is missing', () => {
            const { id: _, ...rest } = validCategory
            expect(validateImportData({ categories: [rest] })).toBe(false)
        })

        it('returns false when category id is a number', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, id: 123 }],
            })).toBe(false)
        })

        it('returns false when category title is missing', () => {
            const { title: _, ...rest } = validCategory
            expect(validateImportData({ categories: [rest] })).toBe(false)
        })

        it('returns false when category color is missing', () => {
            const { color: _, ...rest } = validCategory
            expect(validateImportData({ categories: [rest] })).toBe(false)
        })

        it('returns false when category entries is not an array', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: 'none' }],
            })).toBe(false)
        })

        it('returns false when category activity is missing', () => {
            const { activity: _, ...rest } = validCategory
            expect(validateImportData({ categories: [rest] })).toBe(false)
        })

        it('returns true for category with empty entries array', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [] }],
            })).toBe(true)
        })

        it('returns false when second category is invalid', () => {
            expect(validateImportData({
                categories: [validCategory, { bad: true }],
            })).toBe(false)
        })

        it('passes validation with hidden: true', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, hidden: true }],
            })).toBe(true)
        })

        it('fails validation with hidden: "yes" (wrong type)', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, hidden: 'yes' }],
            })).toBe(false)
        })

        it('passes validation with comment string', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, comment: 'A note' }],
            })).toBe(true)
        })

        it('passes validation without comment (optional)', () => {
            const { comment: _, ...rest } = validCategory as Record<string, unknown>
            expect(validateImportData({
                categories: [rest],
            })).toBe(true)
        })

        it('fails validation with comment: 123 (wrong type)', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, comment: 123 }],
            })).toBe(false)
        })
    })

    describe('activity validation', () => {
        it('returns false when activity title is a number', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, activity: { title: 123, icon: 'x', emoji: 'x' } }],
            })).toBe(false)
        })

        it('returns false when activity icon is missing', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, activity: { title: 'Work', emoji: '💼' } }],
            })).toBe(false)
        })

        it('returns false when activity emoji is missing', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, activity: { title: 'Work', icon: 'briefcase' } }],
            })).toBe(false)
        })

        it('returns false when activity is null', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, activity: null }],
            })).toBe(false)
        })

        it('returns false when activity is a string', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, activity: 'Work' }],
            })).toBe(false)
        })
    })

    describe('seed data validation', () => {
        const seedData = generateSeedData()

        // Nest entries back into categories (import/export format)
        const nested = {
            categories: seedData.categories.map(cat => ({
                ...cat,
                entries: seedData.entries.filter(e => e.categoryId === cat.id),
            })),
        }

        it('passes validation when nested for import', () => {
            expect(validateImportData(nested)).toBe(true)
        })

        it('has 5 categories', () => {
            expect(seedData.categories).toHaveLength(5)
        })

        it('every category has at least one entry', () => {
            for (const category of nested.categories) {
                expect(category.entries.length).toBeGreaterThan(0)
            }
        })

        it('every entry has a categoryId matching an existing category', () => {
            const categoryIds = new Set(seedData.categories.map(c => c.id))
            for (const entry of seedData.entries) {
                expect(categoryIds.has(entry.categoryId)).toBe(true)
            }
        })
    })

    describe('goal validation', () => {
        const validGoal = {
            count: 3,
            interval: 'week',
            unit: 'event',
            days: 127,
            reminder: true,
        }

        it('accepts category with valid goal', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [validGoal] }],
            })).toBe(true)
        })

        it('accepts category with multiple valid goals', () => {
            const second = { ...validGoal, interval: 'day', unit: 'minutes', count: 30 }
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [validGoal, second] }],
            })).toBe(true)
        })

        it('accepts category with empty goals array', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [] }],
            })).toBe(true)
        })

        it('accepts category without goals property (optional)', () => {
            expect(validateImportData({
                categories: [validCategory],
            })).toBe(true)
        })

        it('rejects goal with missing count', () => {
            const { count: _, ...rest } = validGoal
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [rest] }],
            })).toBe(false)
        })

        it('rejects goal with string count', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [{ ...validGoal, count: '3' }] }],
            })).toBe(false)
        })

        it('rejects goal with missing interval', () => {
            const { interval: _, ...rest } = validGoal
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [rest] }],
            })).toBe(false)
        })

        it('rejects goal with invalid interval value', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [{ ...validGoal, interval: 'year' }] }],
            })).toBe(false)
        })

        it('accepts all valid interval values', () => {
            for (const interval of ['day', 'week', 'month']) {
                expect(validateImportData({
                    categories: [{ ...validCategory, goals: [{ ...validGoal, interval }] }],
                })).toBe(true)
            }
        })

        it('rejects goal with missing unit', () => {
            const { unit: _, ...rest } = validGoal
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [rest] }],
            })).toBe(false)
        })

        it('rejects goal with invalid unit value', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [{ ...validGoal, unit: 'seconds' }] }],
            })).toBe(false)
        })

        it('accepts all valid unit values', () => {
            for (const unit of ['event', 'minutes', 'hours', 'days']) {
                expect(validateImportData({
                    categories: [{ ...validCategory, goals: [{ ...validGoal, unit }] }],
                })).toBe(true)
            }
        })

        it('rejects goal with missing days', () => {
            const { days: _, ...rest } = validGoal
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [rest] }],
            })).toBe(false)
        })

        it('rejects goal with string days', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [{ ...validGoal, days: 'Monday' }] }],
            })).toBe(false)
        })

        it('rejects goal with missing reminder', () => {
            const { reminder: _, ...rest } = validGoal
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [rest] }],
            })).toBe(false)
        })

        it('rejects goal with string reminder', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [{ ...validGoal, reminder: 'true' }] }],
            })).toBe(false)
        })

        it('rejects null as a goal', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [null] }],
            })).toBe(false)
        })

        it('rejects string as a goal', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: ['not-a-goal'] }],
            })).toBe(false)
        })

        it('rejects when one goal in array is invalid', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, goals: [validGoal, { ...validGoal, count: 'bad' }] }],
            })).toBe(false)
        })
    })

    describe('entry validation', () => {
        it('accepts entry with null end', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, end: null }] }],
            })).toBe(true)
        })

        it('returns false when entry start is a string', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, start: 'not-a-number' }] }],
            })).toBe(false)
        })

        it('returns false when entry id is missing', () => {
            const { id: _, ...rest } = validEntry
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [rest] }],
            })).toBe(false)
        })

        it('returns false when entry running is a string', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, running: 'yes' }] }],
            })).toBe(false)
        })

        it('returns false when entry categoryId is missing', () => {
            const { categoryId: _, ...rest } = validEntry
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [rest] }],
            })).toBe(false)
        })

        it('returns false when entry end is a string', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, end: '2024-01-01' }] }],
            })).toBe(false)
        })

        it('returns false when entry is null', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [null] }],
            })).toBe(false)
        })

        it('returns true with multiple valid entries', () => {
            const second = { ...validEntry, id: '00000000-0000-4000-8000-000000000004', start: 3000, end: 4000 }
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [validEntry, second] }],
            })).toBe(true)
        })

        it('returns false when one of multiple entries is invalid', () => {
            const bad = { ...validEntry, id: 999 }
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [validEntry, bad] }],
            })).toBe(false)
        })

        it('returns false when entry comment is missing', () => {
            const { comment: _, ...rest } = validEntry
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [rest] }],
            })).toBe(false)
        })

        it('returns false when entry comment is a number', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, comment: 123 }] }],
            })).toBe(false)
        })

        it('accepts entry with non-empty comment', () => {
            expect(validateImportData({
                categories: [{ ...validCategory, entries: [{ ...validEntry, comment: 'hello' }] }],
            })).toBe(true)
        })
    })
})
