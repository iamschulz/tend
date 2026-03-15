/** Checks whether the user prefers reduced motion via localStorage override or OS setting. */
export function prefersReducedMotion(): boolean {
    return localStorage.getItem('force-animation') === 'false'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
