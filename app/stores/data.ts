import { defineStore } from 'pinia'
import type { Category, CategoryData, Entry, EntryWithCategory } from './../types/Category';

export const useDataStore = defineStore('data', {
    state: () => ({
        categories: [] as Category[],
    }),

    persist: true,

    getters: {
        getAllCategories: (state): Category[] => state.categories,

        getCategoryById: (state) => {
            return (categoryId: string) => state.categories.find((x) => x.id === categoryId)
        },

        getAllEntries(state): EntryWithCategory[] {
            return state.categories
                .flatMap(category =>
                    category.entries.map(event => ({
                        ...event,
                        category: {
                            id: category.id,
                            title: category.title,
                            activity: category.activity,
                            color: category.color
                        }
                    }))
                )
                .sort((x, y) => y.start - x.start);
        },

        getTodaysEntries(state): EntryWithCategory[] {
            const today = new Date(Date.now()).getDay();
            return state.categories
                .flatMap(category =>
                    category.entries
                        .filter(event => 
                            new Date(event.start).getDay() === today || 
                            (event.end && new Date(event.end).getDay() === today)
                        )
                        .map(event => ({
                            ...event,
                            category: {
                                id: category.id,
                                title: category.title,
                                activity: category.activity,
                                color: category.color
                            }
                        }))
                )
                .sort((x, y) => y.start - x.start);
        }
    },

    actions: {        
        addCategory(data: CategoryData): void {
            this.categories.push({
                id: crypto.randomUUID(),
                title: data.title,
                activity: data.activity,
                color: data.color,
                entries: []
            });
        },

        updateCategory(data: Partial<Omit<Category, 'entries'>>): void {
            if (!data.id) { return; }
            const category = this.categories.find(x => x.id === data.id);
            if (!category) { return; }

            if (data.title) {
                category.title = data.title;
            }

            if (data.activity) {
                category.activity = data.activity;
            }

            if (data.color) {
                category.color = data.color;
            }
        },

        deleteCategory(id: string): void {
            this.categories = this.categories.filter(x => x.id !== id);
        },

        addEntry(entry: Entry) {
            this.categories.find(x => x.id === entry.categoryId)?.entries.push(
                entry
            );
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

        hasRunningEntries(category: Category): boolean {
            return !!category.entries.find(entry => entry.running);
        },

        closeEntry(id: string): void {
            const entry = this.getAllEntries.find(x => x.id === id);
            if (!entry) { return; }
            entry.end = Date.now();
            entry.running = false;
        },

        closeAllEntries(categoryId: string): void {
            const now = Date.now();
            this.categories.find(x => x.id === categoryId)?.entries.filter(x => x.running || !x.end).forEach(entry => {
                entry.end = now;
                entry.running = false;
            })
        }
    }
});