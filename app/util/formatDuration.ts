export function formatDuration(start: number, end: number): string {
    const diffMs = Math.abs(end - start);
    const d = new Date(diffMs);

    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const s = d.getUTCSeconds();

    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || parts.length === 0) parts.push(`${s}s`);

    return parts.join(' ');
}