export function formatDuration(start: number, end: number): string {
    const diff = Math.abs(end - start);

    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;

    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;

    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;

    const days = Math.floor(totalHours / 24);

    const parts: string[] = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    // Always show seconds if nothing else was added
    if (parts.length === 0) {
        parts.push(`${seconds}s`);
    }

    return parts.join(' ');
}
