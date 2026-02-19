import type { Category } from '~/types/Category'

export function buildExportFilename(): string {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    return `${dd}-${mm}-${yyyy}.tend.json`
}

export function downloadExportData(categories: Category[]): void {
    const data = { categories }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = buildExportFilename()
    a.click()
    URL.revokeObjectURL(url)
}
