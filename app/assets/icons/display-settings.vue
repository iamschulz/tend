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

function onThemeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value
    if (value === 'light' || value === 'dark') {
        localStorage.setItem('force-scheme', value)
        document.documentElement.setAttribute('force-scheme', value)
    } else {
        localStorage.removeItem('force-scheme')
        document.documentElement.removeAttribute('force-scheme')
    }
}
</script>