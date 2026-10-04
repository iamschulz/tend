import type { Goal } from '~/types/Goal'
import type { Entry } from '~/types/Entry'
import { getDayRange, getWeekRange, getMonthRange } from '~~/shared/utils/dateRanges'

const rangeFns = { day: getDayRange, week: getWeekRange, month: getMonthRange } as const
const msPerUnit = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

/**
 * Calculates how much progress has been made toward a goal in its current period.
 * @param goal - The goal definition
 * @param entries - All tracked entries
 * @param categoryId - The category to filter entries by
 * @param now - Current timestamp, used for running entries
 * @param date - The reference date for the goal period (defaults to today)
 */
export function getGoalProgress(
    goal: Goal,
    entries: readonly Entry[],
    categoryId: string,
    now: number = Date.now(),
    date: Date = new Date(),
): number {
    const [start, end] = rangeFns[goal.interval](date)
    const rangeStart = start.getTime()
    const rangeEnd = end.getTime()
    const matching = entries.filter(e => {
        if (e.categoryId !== categoryId) return false
        const eStart = new Date(e.start).getTime()
        const eEnd = e.end ? new Date(e.end).getTime() : Infinity
        return eStart <= rangeEnd && eEnd >= rangeStart
    })
    if (goal.unit === 'event') return matching.filter(e => !e.running).length
    const totalMs = matching.reduce((sum, e) => {
        const clippedStart = Math.max(e.start, rangeStart)
        const clippedEnd = Math.min(e.end ?? now, rangeEnd)
        return sum + (clippedEnd - clippedStart)
    }, 0)
    return totalMs / msPerUnit[goal.unit]
}

/**
 * Returns a key identifying the goal period a date falls in (e.g. "day:1720656000000").
 * Two dates in the same period share a key, which is what makes it usable both for
 * deduplicating notifications and for counting how many periods a streak covers.
 * @param interval - The goal interval (day, week, or month)
 * @param date - The date to locate (defaults to today)
 */
export function getGoalPeriodKey(interval: Goal['interval'], date: Date = new Date()): string {
    const [start] = rangeFns[interval](date)
    return `${interval}:${start.getTime()}`
}
