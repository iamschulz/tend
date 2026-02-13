<template>
    <div>
        <Teleport v-if="mounted" to="#header-title-long">
            {{ monthTitle.long }}
        </Teleport>
        <Teleport v-if="mounted" to="#header-title-short">
            {{ monthTitle.short }}
        </Teleport>
        <OverviewMonth v-if="mounted && routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">The Future's going to be awesome!</p>
        <p v-else-if="!routeValid">Error</p>
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

    const monthTitle = computed(() => {
        return {
            short: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
            long: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        };
    });

    const mounted = ref(false)
    onMounted(() => {
        mounted.value = true
    })
</script>
