<template>
    <div>
        <OverviewYear v-if="mounted && routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">The Future's going to be awesome!</p>
        <p v-else-if="!routeValid">Error</p>
    </div>
</template>

<script setup lang="ts">
    import { getYearRange } from '~/util/getYearRange'

    const route = useRoute()
    const yearParam = computed<string | null>(() => {
        const y = route.params.date
        return typeof y === 'string' ? y : null
    })

    // YYYY validation
    const isRealYear = (s: string) => /^\d{4}$/.test(s)

    // Fallback to current year if param missing
    const date = new Date(Number(yearParam.value || new Date().getFullYear()), 0, 1)

    const routeValid = computed(
        () => !yearParam.value || isRealYear(yearParam.value)
    )

    // Compare by year range
    const isInFuture = computed(() => {
        const [, endOfCurrentYear] = getYearRange(new Date())
        return endOfCurrentYear < date
    })

    const ui = useUiStore()
    watchEffect(() => {
        ui.setCurrentViewDate(date)
    })

    const mounted = ref(false)
    onMounted(() => {
        mounted.value = true
    })
    onBeforeUnmount(() => {
        mounted.value = false
    })
</script>
