import type { TranslateFunction } from '~/types/TranslateFunction'

export function formatDuration(start: number, end: number, t: TranslateFunction): string {
    const diff = Math.abs(end - start);

    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;

    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;

    const days = Math.floor(totalHours / 24);

    const parts: string[] = [];

    if (days) parts.push(`${days}${t('durationD')}`);
    if (hours) parts.push(`${hours}${t('durationH')}`);
    if (minutes) parts.push(`${minutes}${t('durationM')}`);

    // Always show seconds if nothing else was added
    if (parts.length === 0) {
        parts.push(`${seconds}${t('durationS')}`);
    }

    return parts.join(' ');
}
