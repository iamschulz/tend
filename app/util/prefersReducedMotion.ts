export function prefersReducedMotion(): boolean {
    return localStorage.getItem('force-animation') === 'false'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
