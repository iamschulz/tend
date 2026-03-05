import type { Activity } from './Activity'
import type { Goal } from './Goal'

export type Category = {
    id: string;
    title: string;
    activity: Activity;
    color: string;
    goals: Goal[];
    hidden: boolean;
    comment: string;
}
