<template>
    <div>
        <label for="theme-select">{{ $t("theme") }}: </label>
        <select id="theme-select" @change="onThemeChange">
            <option value="">{{ $t("autoTheme") }}</option>
            <option value="light">{{ $t("lightTheme") }}</option>
            <option value="dark">{{ $t("darkTheme") }}</option>
        </select>
    </div>
</template>

<script setup lang="ts">
onMounted(() => {
    const saved = localStorage.getItem('force-scheme')
    if (saved === 'light' || saved === 'dark') {
        document.querySelector<HTMLSelectElement>('#theme-select')!.value = saved
    }
})

/**
 * Updates both theme-color meta tags.
 * When a scheme is forced, both tags get the same color.
 * When auto, restores the media-based defaults so the browser picks the right one.
 * @param forced - 'light', 'dark', or null for auto
 */
function updateThemeColor(forced: string | null) {
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (forced === 'light' || forced === 'dark') {
        const color = forced === 'dark' ? '#1b1b1b' : '#e0e0e0'
        metas.forEach(m => m.setAttribute('content', color))
    } else {
        metas.forEach(m => {
            const isLight = m.getAttribute('media')?.includes('light')
            m.setAttribute('content', isLight ? '#e0e0e0' : '#1b1b1b')
        })
    }
}

/** @param e - The change event from the theme select */
function onThemeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value
    if (value === 'light' || value === 'dark') {
        localStorage.setItem('force-scheme', value)
        document.documentElement.setAttribute('force-scheme', value)
        updateThemeColor(value)
    } else {
        localStorage.removeItem('force-scheme')
        document.documentElement.removeAttribute('force-scheme')
        updateThemeColor(null)
    }
}
</script>