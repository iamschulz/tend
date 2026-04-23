import type { Category } from '~/types/Category'
import type { Entry } from '~/types/Entry'
import type { Day } from '~/types/Day'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'

/** Generates a timestamped filename for data export (e.g. "06-03-2026.tend.json"). */
export function buildExportFilename(): string {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    return `${dd}-${mm}-${yyyy}.tend.json`
}

/**
 * Triggers a JSON file download of an already-shaped export payload.
 * Used by server mode (payload fetched from /api/data/export) and by
 * the local-mode helper below.
 * @param payload - The export object to serialize
 */
export function downloadExportPayload(payload: unknown): void {
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildExportFilename()
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * Exports categories, entries and day notes as a JSON download (local mode path).
 * @param categories - The categories to export
 * @param entries - The entries to export
 * @param days - The day-note records to export
 */
export function downloadExportData(categories: Category[], entries: Entry[], days: Day[] = []): void {
    // Re-nest entries into categories for backward-compatible export format
    const nested: CategoryWithEntries[] = categories.map(cat => ({
        ...cat,
        entries: entries.filter(e => e.categoryId === cat.id),
    }))
    downloadExportPayload({
        categories: nested,
        days: days.filter(d => d.notes),
    })
}
