import type { CategoryRow } from '../database/schema'

/**
 * Maps a flat DB category row to the nested client-facing shape with `activity` object.
 * @param row - The flat category row from the database
 */
export function rowToCategory(row: CategoryRow) {
    return {
        id: row.id,
        title: row.title,
        activity: {
            title: row.activityTitle,
            icon: row.activityIcon,
            emoji: row.activityEmoji,
        },
        color: row.color,
        goals: row.goals,
        hidden: row.hidden,
        comment: row.comment,
    }
}
