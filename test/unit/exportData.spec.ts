import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildExportFilename } from '~/util/exportData'
import { validateImportData } from '~/util/validateImportData'
import { generateSeedData } from '../../scripts/generate-seed-data'

afterEach(() => {
    vi.useRealTimers()
})

describe('buildExportFilename', () => {
    it('returns DD-MM-YYYY.tend.json for a given date', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2025, 2, 5)) // March 5, 2025
        expect(buildExportFilename()).toBe('05-03-2025.tend.json')
    })

    it('zero-pads single-digit day and month', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2025, 0, 1)) // January 1, 2025
        expect(buildExportFilename()).toBe('01-01-2025.tend.json')
    })

    it('handles double-digit day and month', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date(2025, 11, 25)) // December 25, 2025
        expect(buildExportFilename()).toBe('25-12-2025.tend.json')
    })
})

describe('export round-trip', () => {
    it('exported seed data passes validateImportData', () => {
        const seedData = generateSeedData()
        // Re-nest entries into categories (export format)
        const nested = seedData.categories.map(cat => ({
            ...cat,
            entries: seedData.entries.filter(e => e.categoryId === cat.id),
        }))
        const json = JSON.stringify({ categories: nested })
        const parsed: unknown = JSON.parse(json)
        expect(validateImportData(parsed)).toBe(true)
    })

    it('exported empty categories passes validateImportData', () => {
        const json = JSON.stringify({ categories: [] })
        const parsed: unknown = JSON.parse(json)
        expect(validateImportData(parsed)).toBe(true)
    })
})
