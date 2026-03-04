<template>
    <div>
        <LazyTrackerDay v-if="ready" />
        <loading-indicator v-else />
    </div>
</template>

<script setup lang="ts">
    const nuxtApp = useNuxtApp()
    const ready = ref(!nuxtApp.isHydrating)
    onNuxtReady(() => {
        ready.value = true
    })
</script>
