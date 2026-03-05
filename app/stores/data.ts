import { defineStore } from 'pinia'
import { shallowRef, computed } from 'vue'
import type { Category } from '~/types/Category'
import type { CategoryData } from '~/types/CategoryData'
import type { Entry } from '~/types/Entry'
import type { EntryWithCategory } from '~/types/EntryWithCategory'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'
import { idbStorage } from '~/util/idbStorage';

export const useDataStore = defineStore('data', () => {
    const categories = shallowRef<Category[]>([])
    const entries = shallowRef<Entry[]>([])

    // --- Getters ---

    const getAllCategories = computed((): Category[] => categories.value)

    const visibleCategories = computed((): Category[] => categories.value.filter(c => !c.hidden))

    const getCategoryById = computed(() => {
        return (categoryId: string) => categories.value.find((x) => x.id === categoryId)
    })

    const getAllEntries = computed((): EntryWithCategory[] => {
        const categoryMap = new Map<string, Category>()
        for (const cat of categories.value) {
            if (!cat.hidden) categoryMap.set(cat.id, cat)
        }
        return entries.value
            .filter(entry => categoryMap.has(entry.categoryId))
            .map(entry => ({
                ...entry,
                category: categoryMap.get(entry.categoryId),
            }))
            .sort((x, y) => y.start - x.start)
    })

    const hasNoEntries = computed((): boolean => entries.value.length === 0)

    // --- Actions ---

    function addCategory(data: CategoryData): void {
        categories.value = [...categories.value, {
            id: crypto.randomUUID(),
            title: data.title,
            activity: data.activity,
            color: data.color,
            goals: [],
            hidden: false,
            comment: '',
        }]
    }

    function updateCategory(data: Partial<Category>): void {
        if (!data.id) { return }
        const index = categories.value.findIndex(x => x.id === data.id)
        if (index === -1) { return }

        const updated = [...categories.value]
        const category = { ...updated[index]! }

        if (data.title) { category.title = data.title }
        if (data.activity) { category.activity = data.activity }
        if (data.color) { category.color = data.color }
        if (data.goals) { category.goals = data.goals }
        if (data.hidden !== undefined) { category.hidden = data.hidden }
        if (data.comment !== undefined) { category.comment = data.comment }

        updated[index] = category
        categories.value = updated
    }

    function deleteCategory(id: string): void {
        categories.value = categories.value.filter(x => x.id !== id)
        entries.value = entries.value.filter(x => x.categoryId !== id)
    }

    function addEntry(entry: Entry): void {
        entries.value = [...entries.value, entry]
    }

    function deleteEntry(entryId: string): void {
        entries.value = entries.value.filter(x => x.id !== entryId)
    }

    function getEntriesForRange(start: Date, end: Date): EntryWithCategory[] {
        const rangeStart = start.getTime()
        const rangeEnd = end.getTime()

        const categoryMap = new Map<string, Category>()
        for (const cat of categories.value) {
            if (!cat.hidden) categoryMap.set(cat.id, cat)
        }

        return entries.value
            .filter(entry => {
                if (!categoryMap.has(entry.categoryId)) return false
                const eventStart = new Date(entry.start).getTime()
                const eventEnd = entry.end
                    ? new Date(entry.end).getTime()
                    : Infinity

                return eventStart <= rangeEnd && eventEnd >= rangeStart
            })
            .map(entry => ({
                ...entry,
                category: categoryMap.get(entry.categoryId),
            }))
            .sort((x, y) => y.start - x.start)
    }

    function hasRunningEntries(category: Category): boolean {
        return entries.value.some(entry => entry.categoryId === category.id && entry.running)
    }

    function closeEntry(id: string): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, end: Date.now(), running: false }
                : entry
        )
    }

    function importData(importCategories: CategoryWithEntries[]): void {
        const newCategories: Category[] = []
        const newEntries: Entry[] = []

        for (const cat of importCategories) {
            const { entries: catEntries, ...categoryData } = cat
            newCategories.push({ ...categoryData, goals: categoryData.goals ?? [], hidden: categoryData.hidden ?? false, comment: categoryData.comment ?? '' })
            newEntries.push(...catEntries)
        }

        categories.value = newCategories
        entries.value = newEntries
    }

    function updateEntryStart(id: string, start: number): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, start }
                : entry
        )
    }

    function updateEntryEnd(id: string, end: number): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, end }
                : entry
        )
    }

    function updateEntryComment(id: string, comment: string): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, comment }
                : entry
        )
    }

    function closeAllEntries(categoryId: string): void {
        const now = Date.now()
        entries.value = entries.value.map(entry =>
            entry.categoryId === categoryId && (entry.running || !entry.end)
                ? { ...entry, end: now, running: false }
                : entry
        )
    }

    return {
        categories,
        entries,
        getAllCategories,
        visibleCategories,
        getCategoryById,
        getAllEntries,
        hasNoEntries,
        addCategory,
        updateCategory,
        deleteCategory,
        addEntry,
        deleteEntry,
        getEntriesForRange,
        hasRunningEntries,
        closeEntry,
        importData,
        updateEntryStart,
        updateEntryEnd,
        updateEntryComment,
        closeAllEntries,
    }
}, {
    persist: [
        { key: 'tend-categories', pick: ['categories'], storage: idbStorage },
        { key: 'tend-entries', pick: ['entries'], storage: idbStorage },
    ],
})
