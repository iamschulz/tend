<template>
    <div>
        <Teleport to="#header-title-long" v-if="mounted">
            Today
        </Teleport>
        <Teleport to="#header-title-short" v-if="mounted">
            Today
        </Teleport>

        <tracker-day hydrate-on-visible />
    </div>
</template>

<script setup lang="ts">
    const mounted = ref(false)

    onMounted(() => {
        mounted.value = true
    })
</script>