import { watch, computed, onScopeDispose } from 'vue'
import { storeToRefs } from 'pinia'
import { useDataStore } from '~/stores/data'
import { getGoalProgress, getGoalPeriodKey } from '~/util/getGoalProgress'
import type { Goal } from '~/types/Goal'
import type { Category } from '~/types/Category'

/**
 * Watches for goal completions and triggers toast notifications.
 * @param t - Translation function
 */
export function useGoalCompletionWatcher(t: (key: string) => string) {
    const data = useDataStore()
    const { entries, categories } = storeToRefs(data)
    const { addToast } = useToast()

    const notifiedSet = new Set<string>()

    /**
     * Returns a key unique per goal per period, so notifications reset at each new day/week/month boundary.
     * @param categoryId - The category ID
     * @param goalIndex - Index of the goal within the category
     * @param goal - The goal definition
     */
    function deduplicateKey(categoryId: string, goalIndex: number, goal: Goal): string {
        return `${categoryId}:${goalIndex}:${getGoalPeriodKey(goal.interval)}`
    }

    /**
     * Fires a toast notification for a completed goal.
     * @param category - The category that owns the goal
     * @param goal - The completed goal
     */
    function notifyCompletion(category: Category, goal: Goal) {
        addToast(`${category.activity.emoji} ${category.title} — ${t('goalReached')}`, {
            duration: 5000,
            categoryId: category.id,
            goals: [goal],
        })
    }

    /**
     * Scans all goals and notifies newly completed ones.
     * @param notify - Whether to fire toast notifications
     * @param now - Current timestamp for progress calculation
     */
    function scanGoals(notify: boolean, now: number = Date.now()) {
        const todayIndex = (new Date().getDay() + 6) % 7

        for (const category of categories.value) {
            if (category.hidden) continue

            for (let gi = 0; gi < category.goals.length; gi++) {
                const goal = category.goals[gi]!
                if (!(goal.days & (1 << todayIndex))) continue

                const key = deduplicateKey(category.id, gi, goal)
                const progress = getGoalProgress(goal, entries.value, category.id, now)

                if (progress >= goal.count) {
                    if (notifiedSet.has(key)) continue
                    notifiedSet.add(key)
                    if (notify) notifyCompletion(category, goal)
                } else {
                    notifiedSet.delete(key)
                }
            }
        }
    }

    // Snapshot already-completed goals on init (no toast)
    scanGoals(false)

    // Track whether the initial server hydration has occurred so we can
    // suppress notifications for goals that were already complete on the server.
    let wasHydrated = data.serverHydrated

    // Detect event-based completions instantly when entries change
    watch(entries, () => {
        if (!wasHydrated && data.serverHydrated) {
            // First entries change after server hydration — snapshot only
            wasHydrated = true
            scanGoals(false)
        } else {
            scanGoals(true)
        }
    })

    // Detect time-based completions via polling while timers are running
    const hasRunningEntries = computed(() => entries.value.some(e => e.running))
    let tickInterval: ReturnType<typeof setInterval> | null = null

    watch(hasRunningEntries, (running) => {
        if (running && !tickInterval) {
            tickInterval = setInterval(() => scanGoals(true, Date.now()), 1000)
        } else if (!running && tickInterval) {
            clearInterval(tickInterval)
            tickInterval = null
        }
    }, { immediate: true })

    onScopeDispose(() => {
        if (tickInterval) {
            clearInterval(tickInterval)
            tickInterval = null
        }
    })
}
