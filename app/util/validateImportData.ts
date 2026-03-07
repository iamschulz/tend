import { importDataSchema } from '~~/shared/schemas/importData'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'

export type ImportData = {
    categories: CategoryWithEntries[]
}

/**
 * Validates that unknown data conforms to the ImportData shape.
 * @param data - The data to validate
 */
export function validateImportData(data: unknown): data is ImportData {
    return importDataSchema.safeParse(data).success
}
