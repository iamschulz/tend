<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <LazyOverviewMonth v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <ErrorNotice v-else-if="!routeValid" />
    </div>
</template>

<script setup lang="ts">
    const route = useRoute()
    const monthParam = computed<string | null>(() => {
        const m = route.params.date
        return typeof m === 'string' ? m : null
    })

    /** @param s - The month string to validate as YYYY-MM */
    const isRealMonth = (s: string) =>
        /^\d{4}-\d{2}$/.test(s) &&
        (() => {
            const d = new Date(`${s}-01`)
            return !Number.isNaN(d.getTime())
        })()

    // Fallback to current month if param missing
    const date = new Date(`${monthParam.value}-01`);

    const routeValid = computed(
        () => !monthParam.value || isRealMonth(monthParam.value)
    )

    // Compare by local month
    const isInFuture = computed(() => {
        if (!monthParam.value || !routeValid.value) return false
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        return monthParam.value > currentMonth
    })

    const ui = useUiStore()
    watchEffect(() => {
        ui.setCurrentViewDate(date)
    })

    const nuxtApp = useNuxtApp()
    const mounted = ref(import.meta.client && !nuxtApp.isHydrating)
    onNuxtReady(() => {
        mounted.value = true
    })
</script>
