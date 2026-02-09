<template>
    <tracker-day hydrate-on-visible />
</template>

<script setup lang="ts">
    const mounted = ref(false)

    onMounted(() => {
        mounted.value = true
    })
</script>