import type { Entry } from './Entry'
import type { Category } from './Category'

export type EntryWithCategory = Entry & {
    category: Category | undefined;
};
