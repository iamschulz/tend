<template>
    <div>
        <tracker-day v-if="ready" />
        <loading-indicator v-else />
    </div>
</template>

<script setup lang="ts">
    const ready = ref(false)
    onNuxtReady(() => {
        ready.value = true
    })
</script>
