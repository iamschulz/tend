/**
 * Applies the user's saved colour scheme before first paint to prevent a flash
 * of the wrong theme. Reads `force-scheme` from localStorage and, when set,
 * reflects it onto the `force-scheme` attribute of `<html>` and updates both
 * `theme-color` meta tags to the matching colour value.
 *
 * Intentionally written without minification — this function is serialized via
 * `.toString()` and injected as a render-blocking inline `<script>` in `<head>`.
 * Formatting changes here will change the CSP hash, which nuxt.config.ts
 * recomputes automatically from the serialized output.
 */
function applyTheme() {
    const scheme = localStorage.getItem('force-scheme')
    if (scheme === 'light' || scheme === 'dark') {
        document.documentElement.setAttribute('force-scheme', scheme)
        const color = scheme === 'dark' ? '#1B1B1B' : '#E0E0E0'
        document.querySelectorAll<HTMLMetaElement>('meta[name=theme-color]').forEach(function (meta) {
            meta.content = color
        });
    }
}

/**
 * The theme script serialized as an IIFE string, ready for use as an inline
 * `<script>` tag. Imported by nuxt.config.ts, which computes the CSP hash
 * from this value and injects it into every page's `<head>`.
 */
export const themeScript = `(${applyTheme.toString()})()`
