import { defineStore } from 'pinia'
import type { Activity, Category, EntryWithCategory } from './../types/Category';

export const useDataStore = defineStore('data', {
    state: () => ({
        categories: [] as Category[]
    }),

    getters: {
        getAllCategories: (state): Category[] => state.categories,
        getCategoryById: (state) => {
        return (categoryId: string) => state.categories.find((x) => x.id === categoryId)
        },
    },

    actions: {
        addCategory(title: string, color: string, activity: Activity): void {
            this.categories.push({
                id: crypto.randomUUID(),
                title,
                activity,
                color,
                entries: []
            });
        },

        deleteCategory(id: string): void {
            this.categories = this.categories.filter(x => x.id !== id);
        },

        getAllEntries(withCategories = false): EntryWithCategory[] {
            return this.categories
                .flatMap(category =>
                    category.entries.map(event => ({
                        ...event,
                        category: withCategories ? {
                            id: category.id,
                            title: category.title,
                            activity: category.activity,
                            color: category.color
                        } : undefined
                    }))
                )
                .sort((x, y) => y.start - x.start);
        },

        deleteEntry(entryId: string): void {
            for (const category of this.categories) {
                const index = category.entries.findIndex(x => x.id === entryId);
                if (index !== -1) {
                    category.entries.splice(index, 1);
                    return;
                }
            }
        },

        closeEntry(id: string): void {
            const entry = this.getAllEntries().find(x => x.id === id);
            if (!entry) { return; }
            entry.end = Date.now();
            entry.running = false;
        },

        closeAllEntries(categoryId: string): void {
            const now = Date.now();
            this.categories.find(x => x.id === categoryId)?.entries.forEach(entry => {
                entry.end = now;
                entry.running = false;
            })
        }
    }
})