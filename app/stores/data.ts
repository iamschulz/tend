import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import type { Category } from '~/types/Category'
import type { CategoryData } from '~/types/CategoryData'
import type { Day } from '~/types/Day'
import type { Entry } from '~/types/Entry'
import type { EntryWithCategory } from '~/types/EntryWithCategory'
import type { CategoryWithEntries } from '~/types/CategoryWithEntries'
import { idbStorage } from '~/util/idbStorage';

export const useDataStore = defineStore('data', () => {
    const categories = shallowRef<Category[]>([])
    const entries = shallowRef<Entry[]>([])
    /** Per-day notes keyed by YYYY-MM-DD local date string. */
    const days = shallowRef<Record<string, Day>>({})

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

    const visibleCategoryMap = computed(() => {
        const map = new Map<string, Category>()
        for (const cat of categories.value) {
            if (!cat.hidden) map.set(cat.id, cat)
        }
        return map
    })

    const getAllEntries = computed((): EntryWithCategory[] => {
        const categoryMap = visibleCategoryMap.value
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
        const categoryMap = visibleCategoryMap.value

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
     * Replaces all data with imported categories, entries and day notes.
     * @param importCategories - Categories (with nested entries) to import
     * @param importDays - Day-note records to import; omitted or empty wipes existing days
     */
    function importData(importCategories: CategoryWithEntries[], importDays: Day[] = []): void {
        const newCategories: Category[] = []
        const newEntries: Entry[] = []

        for (const cat of importCategories) {
            const { entries: catEntries, ...categoryData } = cat
            newCategories.push({ ...categoryData, goals: categoryData.goals ?? [], hidden: categoryData.hidden ?? false, comment: categoryData.comment ?? '' })
            newEntries.push(...catEntries)
        }

        const newDays: Record<string, Day> = {}
        for (const d of importDays) {
            if (d.notes) newDays[d.date] = d
        }

        categories.value = newCategories
        entries.value = newEntries
        days.value = newDays
        sync('/api/data/import', {
            method: 'POST',
            body: { categories: importCategories, days: importDays },
        })
    }

    /**
     * Partially updates an entry by ID.
     * @param id - The entry ID
     * @param fields - The fields to update
     */
    function updateEntry(id: string, fields: Partial<Omit<Entry, 'id'>>): void {
        entries.value = entries.value.map(entry =>
            entry.id === id
                ? { ...entry, ...fields }
                : entry
        )
        sync(`/api/entries/${id}`, { method: 'PUT', body: { id, ...fields } })
    }

    /**
     * Returns the stored notes for a given local date, or '' if none are cached.
     * @param date - Local YYYY-MM-DD date string
     */
    function getDayNotes(date: string): string {
        return days.value[date]?.notes ?? ''
    }

    /**
     * Fetches a day's notes from the server (server mode only) and caches
     * the result in the local store. Safe to call multiple times.
     * @param date - Local YYYY-MM-DD date string
     */
    async function loadDay(date: string): Promise<void> {
        if (!isServerMode) return
        try {
            const day = await $fetch<Day>(`/api/days/${date}`)
            days.value = { ...days.value, [date]: day }
        } catch (err) {
            console.warn(`[loadDay] GET /api/days/${date} failed:`, err)
        }
    }

    /**
     * Optimistically updates the cached notes for a date and syncs the
     * change to the server.
     * @param date - Local YYYY-MM-DD date string
     * @param notes - The new notes text
     */
    function updateDayNotes(date: string, notes: string): void {
        days.value = { ...days.value, [date]: { date, notes } }
        sync(`/api/days/${date}`, { method: 'PUT', body: { notes } })
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
        days,
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
        updateEntry,
        closeAllEntries,
        hydrateFromServer,
        getDayNotes,
        loadDay,
        updateDayNotes,
    }
}, {
    persist: [
        { key: 'tend-categories', pick: ['categories'], storage: idbStorage },
        { key: 'tend-entries', pick: ['entries'], storage: idbStorage },
        { key: 'tend-days', pick: ['days'], storage: idbStorage },
    ],
})
