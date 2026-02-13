<template>
    <div>
        <Teleport v-if="mounted" to="#header-title-long">
            {{ weekTitle.long }}
        </Teleport>
        <Teleport v-if="mounted" to="#header-title-short">
            {{ weekTitle.short }}
        </Teleport>
        <OverviewWeek v-if="mounted && routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">The Future's going to be awesome!</p>
        <p v-else-if="!routeValid">Error</p>
    </div>
</template>

<script setup lang="ts">
    import { getWeekRange } from "~/util/getWeekRange"

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
            const d = new Date((year || 0), 0, 4) // Jan 4 always in week 1
            d.setDate(d.getDate() + ((week || 0) - 1) * 7)

            return !Number.isNaN(d.getTime())
        })()

    // Convert ISO week to Date (start of week)
    const getDateFromWeek = (s: string) => {
        const [year, week] = s.split('-W').map(Number)
        const jan4 = new Date((year || 0), 0, 4)
        const dayOfWeek = jan4.getDay() || 7
        const monday = new Date(jan4)
        monday.setDate(jan4.getDate() - dayOfWeek + 1 + ((week || 0) - 1) * 7)
        return monday
    }

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

    const weekStart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const weekEnd = new Date(date.getTime() + 6 * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const weekTitle = computed(() => {
        return {
            short: `${weekStart} – ${weekEnd}`,
            long: `Week of ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`,
        };
    });

    const mounted = ref(false)
    onMounted(() => {
        mounted.value = true
    })
</script>
