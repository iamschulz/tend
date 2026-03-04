export type Goal = {
	count: number;
	interval: 'day' | 'week' | 'month';
	days: number;
	reminder: boolean;
}
