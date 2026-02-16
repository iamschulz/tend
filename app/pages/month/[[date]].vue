<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <OverviewMonth v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <p v-else-if="!routeValid">{{ $t('error') }}</p>
    </div>
</template>

<script setup lang="ts">
    import { getMonthRange } from '~/util/getMonthRange'

    const route = useRoute()
    const monthParam = computed<string | null>(() => {
        const m = route.params.date
        return typeof m === 'string' ? m : null
    })

    // YYYY-MM validation
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

    // Compare by month range
    const isInFuture = computed(() => {
        const [, endOfCurrentMonth] = getMonthRange(new Date())
        return endOfCurrentMonth < date
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
