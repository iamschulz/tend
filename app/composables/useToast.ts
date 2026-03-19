import { ref, readonly } from 'vue'
import type { Goal } from '~/types/Goal'

export interface Toast {
    id: string
    message: string
    duration: number
    categoryId?: string
    goals?: readonly Goal[]
}

const toasts = ref<Toast[]>([])
let nextId = 0
const { announce } = useAnnounce()

/** Provides reactive toast notification state and helpers. */
export function useToast() {
    /**
     * Adds a toast notification.
     * @param message - The message to display
     * @param options - Toast options
     * @param options.duration - How long to show the toast in ms
     * @param options.categoryId - Associated category ID
     * @param options.goals - Goals to display in the toast
     * @param options.announceText - The announcer label
     */
    const addToast = (message: string, options: { duration?: number, categoryId?: string, goals?: readonly Goal[], announceText?: string } = {}): string => {
        const id = String(nextId++)
        const { duration = 3000, announceText, ...rest } = options
        toasts.value.push({ id, message, duration, ...rest })
        announce(announceText ?? message)
        return id
    }

    /**
     * Removes a toast by ID.
     * @param id - The toast ID to remove
     */
    const removeToast = (id: string) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts: readonly(toasts),
        addToast,
        removeToast,
    }
}
