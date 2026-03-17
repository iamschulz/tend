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
    const { announce } = useAnnounce()

    const notifiedSet = new Set<string>()
    const progressMap = new Map<string, number>()

    /** Maps goal units to their display suffixes. */
    const unitSuffix: Record<string, string> = { event: 'x', minutes: 'm', hours: 'h', days: 'd' }

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
     * Returns a formatted goal label, e.g. "5x / perDay".
     * @param goal - The goal definition
     */
    function goalLabel(goal: Goal): string {
        const interval = goal.interval.charAt(0).toUpperCase() + goal.interval.slice(1)
        return `${goal.count}${unitSuffix[goal.unit] ?? ''} ${t('per')} ${t(`per${interval}`)}`
    }

    /**
     * Fires a toast notification for a completed goal.
     * @param category - The category that owns the goal
     * @param goal - The completed goal
     */
    function notifyCompletion(category: Category, goal: Goal) {
        const message = `${category.activity.emoji} ${category.title} - ${t('goalReached')}`
        addToast(message, {
            duration: 5000,
            categoryId: category.id,
            goals: [goal],
            announceText: `${message}: ${goalLabel(goal)}`,
        })
    }

    /**
     * Announces the current progress toward a goal.
     * @param category - The category that owns the goal
     * @param goal - The goal definition
     * @param progress - The current progress value
     */
    function announceProgress(category: Category, goal: Goal, progress: number) {
        const label = `${category.activity.emoji} ${category.title}: ${Math.floor(progress)}${unitSuffix[goal.unit] ?? ''} ${t('of')} ${goalLabel(goal)}`
        announce(label)
    }

    /**
     * Scans all goals and notifies newly completed or progressed ones.
     * @param notify - Whether to fire toast notifications for completions
     * @param notifyProgress - Whether to announce progress changes
     * @param now - Current timestamp for progress calculation
     */
    function scanGoals(notify: boolean, notifyProgress: boolean = false, now: number = Date.now()) {
        const todayIndex = (new Date().getDay() + 6) % 7

        for (const category of categories.value) {
            if (category.hidden) continue

            for (let gi = 0; gi < (category.goals?.length ?? 0); gi++) {
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
                    if (notifyProgress && progress > (progressMap.get(key) ?? 0)) {
                        announceProgress(category, goal, progress)
                    }
                }

                progressMap.set(key, progress)
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
            scanGoals(true, true)
        }
    })

    // Detect time-based completions via polling while timers are running
    const hasRunningEntries = computed(() => entries.value.some(e => e.running))
    let tickInterval: ReturnType<typeof setInterval> | null = null

    watch(hasRunningEntries, (running) => {
        if (running && !tickInterval) {
            tickInterval = setInterval(() => scanGoals(true, false, Date.now()), 1000)
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
