<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <LazyOverviewWeek v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <ErrorNotice v-else-if="!routeValid" />
    </div>
</template>

<script setup lang="ts">
    import { getDateFromWeek } from "~/util/getDateFromWeek"

    const route = useRoute()

    const weekParam = computed<string | null>(() => {
        const w = route.params.date
        return typeof w === 'string' ? w : null
    })

    /** @param s - The week string to validate as YYYY-Www */
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

    // Compare by local ISO week
    const isInFuture = computed(() => {
        if (!weekParam.value || !routeValid.value) return false
        const now = new Date()
        // calendar week 1 depends on 1st thursday (iso 8601)
        const thu = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (4 - (now.getDay() || 7)))
        const jan1 = new Date(thu.getFullYear(), 0, 1)
        const week = Math.ceil(((thu.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
        const currentWeek = `${thu.getFullYear()}-W${String(week).padStart(2, '0')}`
        return weekParam.value > currentWeek
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
