import type { Goal } from '~/types/Goal'
import type { Entry } from '~/types/Entry'
import { getDayRange, getWeekRange, getMonthRange } from '~~/shared/utils/dateRanges'
import { getGoalProgress } from '~/util/getGoalProgress'

const rangeFns = { day: getDayRange, week: getWeekRange, month: getMonthRange } as const

/** Maximum number of periods to walk backward, per interval (~2 years). */
const maxPeriods = { day: 730, week: 105, month: 24 } as const

export type GoalStreak = { current: number; best: number }

/**
 * Computes the current and best streak for a goal by walking backward
 * period-by-period from `now`, counting consecutive met periods.
 *
 * A period counts as met when its progress reaches `goal.count` (a partially
 * met period breaks the streak). Only completed entries count — a still-running
 * timer contributes nothing until it is stopped. For day-interval goals, periods
 * whose weekday is excluded by the `days` bitmask are skipped without breaking
 * the streak. The current, still-running period never breaks the streak while it
 * is merely in progress — it only contributes once actually met.
 *
 * @param goal - The goal definition
 * @param entries - All tracked entries
 * @param categoryId - The category to filter entries by
 * @param now - Current timestamp (defaults to Date.now())
 */
export function getGoalStreak(
    goal: Goal,
    entries: readonly Entry[],
    categoryId: string,
    now: number = Date.now(),
): GoalStreak {
    // Streaks are built from completed goals only, so running timers are ignored.
    const completed = entries.filter(e => !e.running && e.end !== null)

    // Bound the walk at the earliest entry for this category — nothing before it can be met.
    let earliest = Infinity
    for (const e of completed) {
        if (e.categoryId === categoryId && e.start < earliest) earliest = e.start
    }
    if (earliest === Infinity) return { current: 0, best: 0 }

    const rangeFn = rangeFns[goal.interval]
    let cursor = new Date(now)
    let current = 0
    let best = 0
    let run = 0
    let currentOpen = true // still extending the leading (current) streak

    for (let i = 0; i < maxPeriods[goal.interval]; i++) {
        const [start, end] = rangeFn(cursor)
        if (end.getTime() < earliest) break

        const applicable = goal.interval !== 'day' || !!(goal.days & (1 << ((start.getDay() + 6) % 7)))
        if (applicable) {
            const met = getGoalProgress(goal, completed, categoryId, now, start) >= goal.count
            const inProgress = now >= start.getTime() && now <= end.getTime()
            if (met) {
                run++
                if (currentOpen) current++
            } else if (inProgress) {
                // Current period on track / not yet met — neither counts nor breaks.
            } else {
                if (run > best) best = run
                run = 0
                currentOpen = false
            }
        }

        // Step to the last moment before this period — a point inside the previous one.
        cursor = new Date(start.getTime() - 1)
    }

    if (run > best) best = run
    return { current, best }
}
