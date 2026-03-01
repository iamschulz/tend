<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <LazyOverviewYear v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <p v-else-if="!routeValid">{{ $t('error') }}</p>
    </div>
</template>

<script setup lang="ts">
    const route = useRoute()
    const yearParam = computed<string | null>(() => {
        const y = route.params.date
        return typeof y === 'string' ? y : null
    })

    // YYYY validation
    const isRealYear = (s: string) => /^\d{4}$/.test(s)

    // Fallback to current year if param missing
    const date = new Date(Date.UTC(Number(yearParam.value || new Date().getUTCFullYear()), 0, 1))

    const routeValid = computed(
        () => !yearParam.value || isRealYear(yearParam.value)
    )

    // Compare by local year
    const isInFuture = computed(() => {
        return !!yearParam.value && Number(yearParam.value) > new Date().getFullYear()
    })

    const ui = useUiStore()
    watchEffect(() => {
        ui.setCurrentViewDate(date)
    })

    const mounted = ref(false)
    onNuxtReady(() => {
        mounted.value = true
    })
    onBeforeUnmount(() => {
        mounted.value = false
    })
</script>
