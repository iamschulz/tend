<template>
    <div>
        <OverviewWeek v-if="mounted && routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <p v-else-if="!routeValid">{{ $t('error') }}</p>
    </div>
</template>

<script setup lang="ts">
    import { getWeekRange } from "~/util/getWeekRange"
    import { getDateFromWeek } from "~/util/getDateFromWeek"

    const route = useRoute()

    const weekParam = computed<string | null>(() => {
        const w = route.params.date
        return typeof w === 'string' ? w : null
    })

    // ISO week validation: YYYY-Www
    const isRealWeek = (s: string) =>
        /^\d{4}-W\d{2}$/.test(s) &&
        (() => {
            const [year, week] = s.split('-W').map(Number)

            // ISO week → date sanity check
            const d = new Date(Date.UTC(year || 0, 0, 4)) // Jan 4 always in week 1
            d.setUTCDate(d.getUTCDate() + ((week || 0) - 1) * 7)

            return !Number.isNaN(d.getTime())
        })()

    // Fallback to current week if param missing
    const date = weekParam.value
        ? getDateFromWeek(weekParam.value)
        : new Date()

    const routeValid = computed(
        () => !weekParam.value || isRealWeek(weekParam.value)
    )

    // Compare by week range
    const isInFuture = computed(() => {
        const [, endOfCurrentWeek] = getWeekRange(new Date())
        return endOfCurrentWeek < date
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
