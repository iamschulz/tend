import type { Goal } from '~/types/Goal'
import type { Entry } from '~/types/Entry'
import { getDayRange } from '~/util/getDayRange'
import { getWeekRange } from '~/util/getWeekRange'
import { getMonthRange } from '~/util/getMonthRange'

const rangeFns = { day: getDayRange, week: getWeekRange, month: getMonthRange } as const
const msPerUnit = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

/**
 * Calculates how much progress has been made toward a goal in its current period.
 * @param goal - The goal definition
 * @param entries - All tracked entries
 * @param categoryId - The category to filter entries by
 * @param now - Current timestamp, used for running entries
 */
export function getGoalProgress(
    goal: Goal,
    entries: readonly Entry[],
    categoryId: string,
    now: number = Date.now(),
): number {
    const [start, end] = rangeFns[goal.interval](new Date())
    const rangeStart = start.getTime()
    const rangeEnd = end.getTime()
    const matching = entries.filter(e => {
        if (e.categoryId !== categoryId) return false
        const eStart = new Date(e.start).getTime()
        const eEnd = e.end ? new Date(e.end).getTime() : Infinity
        return eStart <= rangeEnd && eEnd >= rangeStart
    })
    if (goal.unit === 'event') return matching.length
    const totalMs = matching.reduce((sum, e) => sum + ((e.end ?? now) - e.start), 0)
    return totalMs / msPerUnit[goal.unit]
}

/**
 * Returns a deduplication key for a goal's current period (e.g. "day:1720656000000").
 * @param interval - The goal interval (day, week, or month)
 */
export function getGoalPeriodKey(interval: Goal['interval']): string {
    const [start] = rangeFns[interval](new Date())
    return `${interval}:${start.getTime()}`
}
