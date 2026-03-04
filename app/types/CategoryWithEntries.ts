import type { Category } from './Category'
import type { Entry } from './Entry'

/** Category bundled with its entries, used for import/export JSON format */
export type CategoryWithEntries = Category & {
    entries: Entry[];
};
