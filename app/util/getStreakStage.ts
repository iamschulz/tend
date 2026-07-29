/**
 * Streak length, in days, at which each growth stage starts. Eight stages, from a
 * grass blade at the shortest streak to a full tree at the longest.
 *
 * The thresholds follow the milestones already celebrated by
 * {@link useGoalCompletionWatcher}, so a toast and a new stage tend to coincide.
 */
export const streakStageThresholds = [2, 3, 7, 14, 21, 30, 50, 100] as const

/** Number of growth stages, and therefore of `streak-<n>.svg` icons expected. */
export const streakStageCount = streakStageThresholds.length

/** Shortest streak that counts as one — below this there is no stage to show. */
export const minStreakLength = streakStageThresholds[0]

/**
 * Maps a streak length to its growth stage.
 *
 * The result is always a real stage: anything below the first threshold — including 0,
 * negatives and non-numbers — clamps to the first stage, and anything at or beyond the
 * last threshold clamps to the last. Callers therefore never have to handle a missing
 * stage, and can never build a path to an icon that does not exist. Deciding *whether* a
 * day deserves a marker at all is the caller's job, see {@link minStreakLength}.
 *
 * @param length - Streak length in days
 * @returns Stage from 1 to {@link streakStageCount}
 */
export function getStreakStage(length: number): number {
    let stage = 1
    for (let i = 0; i < streakStageThresholds.length; i++) {
        if (length >= streakStageThresholds[i]!) {
            stage = i + 1
        }
    }
    return stage
}

/**
 * Public path of the growth-stage icon for a streak length.
 * @param length - Streak length in days
 */
export function getStreakIcon(length: number): string {
    return `/streak-${getStreakStage(length)}.svg`
}
