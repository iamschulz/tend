import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import type { Category } from '~/types/Category'
import type { CategoryData } from '~/types/CategoryData'
import type { Entry } from '~/types/Entry'
import type { EntryWithCategory } from '~/types/EntryWithCategory'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'
import { idbStorage } from '~/util/idbStorage';

export const useDataStore = defineStore('data', () => {
    const categories = shallowRef<Category[]>([])
    const entries = shallowRef<Entry[]>([])

    // --- Server sync ---

    const config = useRuntimeConfig()
    const isServerMode = config.public.backendMode === 'server'
    const serverHydrated = ref(!isServerMode)

    /**
     * Fire-and-forget API call. Swallows errors so the optimistic
     * local update stays in place even when offline (PWA).
     * @param url - The API endpoint path
     * @param opts - $fetch options (method, body, etc.)
     */
    function sync(url: string, opts?: Parameters<typeof $fetch>[1]) {
        if (!isServerMode) return
        $fetch(url, opts).catch((err) => {
            console.warn(`[sync] ${opts?.method ?? 'GET'} ${url} failed:`, err)
        })
    }

    /**
     * Fetches all categories and entries from the server and replaces
     * the local store state. Used on initial load and reconnect.
     */
    async function hydrateFromServer(): Promise<void> {
        const [serverCategories, serverEntries] = await Promise.all([
            $fetch<Category[]>('/api/categories'),
            $fetch<Entry[]>('/api/entries'),
        ])
        categories.value = serverCategories
        entries.value = serverEntries
        serverHydrated.value = true
    }

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

    /**
     * Creates a new category.
     * @param data - The category data (title, activity, color)
     */
    function addCategory(data: CategoryData): void {
        const category: Category = {
            id: crypto.randomUUID(),
            title: data.title,
            activity: data.activity,
            color: data.color,
            goals: [],
            hidden: false,
            comment: '',
        }
        categories.value = [...categories.value, category]
        sync('/api/categories', { method: 'POST', body: category })
    }

    /**
     * Partially updates an existing category by ID.
     * @param data - The fields to update (must include id)
     */
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
        sync(`/api/categories/${data.id}`, { method: 'PUT', body: data })
    }

    /**
     * Deletes a category and all its entries.
     * @param id - The category ID to delete
     */
    function deleteCategory(id: string): void {
        categories.value = categories.value.filter(x => x.id !== id)
        entries.value = entries.value.filter(x => x.categoryId !== id)
        sync(`/api/categories/${id}`, { method: 'DELETE' })
    }

    /**
     * Adds an entry.
     * @param entry - The entry to add
     */
    function addEntry(entry: Entry): void {
        entries.value = [...entries.value, entry]
        sync('/api/entries', { method: 'POST', body: entry })
    }

    /**
     * Deletes an entry by ID.
     * @param entryId - The entry ID to delete
     */
    function deleteEntry(entryId: string): void {
        entries.value = entries.value.filter(x => x.id !== entryId)
        sync(`/api/entries/${entryId}`, { method: 'DELETE' })
    }

    /**
     * Returns entries (with their category) that overlap a given date range.
     * @param start - Range start date
     * @param end - Range end date
     */
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

    /**
     * Checks whether a category has any running entries.
     * @param category - The category to check
     */
    function hasRunningEntries(category: Category): boolean {
        return entries.value.some(entry => entry.categoryId === category.id && entry.running)
    }

    /**
     * Stops a running entry by setting its end time to now.
     * @param id - The entry ID to close
     */
    function closeEntry(id: string): void {
        const now = Date.now()
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, end: now, running: false }
                : entry
        )
        sync(`/api/entries/${id}`, { method: 'PUT', body: { id, end: now, running: false } })
    }

    /**
     * Replaces all data with imported categories and entries.
     * @param importCategories - Categories (with nested entries) to import
     */
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
        sync('/api/data/import', { method: 'POST', body: { categories: importCategories } })
    }

    /**
     * Updates the start timestamp of an entry.
     * @param id - The entry ID
     * @param start - New start timestamp in milliseconds
     */
    function updateEntryStart(id: string, start: number): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, start }
                : entry
        )
        sync(`/api/entries/${id}`, { method: 'PUT', body: { id, start } })
    }

    /**
     * Updates the end timestamp of an entry.
     * @param id - The entry ID
     * @param end - New end timestamp in milliseconds
     */
    function updateEntryEnd(id: string, end: number): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, end }
                : entry
        )
        sync(`/api/entries/${id}`, { method: 'PUT', body: { id, end } })
    }

    /**
     * Updates the comment of an entry.
     * @param id - The entry ID
     * @param comment - New comment text
     */
    function updateEntryComment(id: string, comment: string): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, comment }
                : entry
        )
        sync(`/api/entries/${id}`, { method: 'PUT', body: { id, comment } })
    }

    /**
     * Closes all running entries for a category.
     * @param categoryId - The category whose entries to close
     */
    function closeAllEntries(categoryId: string): void {
        const now = Date.now()
        entries.value = entries.value.map(entry => {
            if (entry.categoryId === categoryId && (entry.running || !entry.end)) {
                const closed = { ...entry, end: now, running: false }
                sync(`/api/entries/${entry.id}`, { method: 'PUT', body: { id: entry.id, end: now, running: false } })
                return closed
            }
            return entry
        })
    }

    return {
        categories,
        entries,
        isServerMode,
        serverHydrated,
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
        hydrateFromServer,
    }
}, {
    persist: [
        { key: 'tend-categories', pick: ['categories'], storage: idbStorage },
        { key: 'tend-entries', pick: ['entries'], storage: idbStorage },
    ],
})
