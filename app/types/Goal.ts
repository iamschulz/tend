export type Goal = {
	count: number;
	interval: 'day' | 'week' | 'month';
	unit: 'event' | 'minutes' | 'hours' | 'days';
	days: number;
	reminder: boolean;
}
