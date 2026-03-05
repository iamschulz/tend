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

export function useToast() {
    const addToast = (message: string, options: { duration?: number, categoryId?: string, goals?: readonly Goal[] } = {}): string => {
        const id = String(nextId++)
        const { duration = 3000, ...rest } = options
        toasts.value.push({ id, message, duration, ...rest })
        return id
    }

    const removeToast = (id: string) => {
        toasts.value = toasts.value.filter(t => t.id !== id)
    }

    return {
        toasts: readonly(toasts),
        addToast,
        removeToast,
    }
}
