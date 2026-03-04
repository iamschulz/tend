import { describe, it, expect } from 'vitest'
import { validateImportData } from '~/util/validateImportData'
import { generateSeedData } from '../../scripts/generate-seed-data'

const validEntry = {
    id: 'entry-1',
    start: 1000,
    end: 2000,
    running: false,
    categoryId: 'cat-1',
    comment: '',
}

const validActivity = { title: 'Work', icon: 'briefcase', emoji: '💼' }

const validCategory = {
    id: 'cat-1',
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
            const second = { ...validCategory, id: 'cat-2', title: 'Play', entries: [] }
            expect(validateImportData({ categories: [validCategory, second] })).toBe(true)
        })

        it('returns true for empty categories array', () => {
            expect(validateImportData({ categories: [] })).toBe(true)
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
            const second = { ...validEntry, id: 'entry-2', start: 3000, end: 4000 }
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
