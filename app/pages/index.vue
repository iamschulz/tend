<template>
    <div>

        <tracker-day hydrate-on-visible />
    </div>
</template>

<script setup lang="ts">
    const mounted = ref(false)

    onMounted(() => {
        mounted.value = true
    })

    onBeforeUnmount(() => {
        mounted.value = false
    })
</script>