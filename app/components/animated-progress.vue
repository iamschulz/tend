<template>
    <progress :value="animated" :max="props.goal.count" class="animated-progress" :style="color ? { accentColor: color } : undefined">
        {{ progress }} / {{ props.goal.count }}
    </progress>
</template>

<script setup lang="ts">
    import type { Goal } from '~/types/Goal';
    import { useDataStore } from '~/stores/data';
    import { getDayRange } from '~/util/getDayRange';
    import { getWeekRange } from '~/util/getWeekRange';
    import { getMonthRange } from '~/util/getMonthRange';

    const props = defineProps<{
        goal: Goal
        categoryId: string
    }>()

    const data = useDataStore()
    const color = computed(() => data.getCategoryById(props.categoryId)?.color)

    const rangeFns = {
        day: getDayRange,
        week: getWeekRange,
        month: getMonthRange,
    } as const

    const msPerUnit = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const

    const now = ref(Date.now())
    const hasRunning = computed(() => data.entries.some(e => e.categoryId === props.categoryId && e.running))
    let tickInterval: ReturnType<typeof setInterval> | null = null

    watch(hasRunning, (running) => {
        if (running && !tickInterval) {
            tickInterval = setInterval(() => { now.value = Date.now() }, 1000)
        } else if (!running && tickInterval) {
            clearInterval(tickInterval)
            tickInterval = null
        }
    }, { immediate: true })

    const progress = computed(() => {
        const [start, end] = rangeFns[props.goal.interval](new Date())
        const rangeStart = start.getTime()
        const rangeEnd = end.getTime()
        const matching = data.entries.filter(e => {
            if (e.categoryId !== props.categoryId) return false
            const eStart = new Date(e.start).getTime()
            const eEnd = e.end ? new Date(e.end).getTime() : Infinity
            return eStart <= rangeEnd && eEnd >= rangeStart
        })

        if (props.goal.unit === 'event') return matching.length

        const totalMs = matching.reduce((sum, e) => {
            return sum + ((e.end ?? now.value) - e.start)
        }, 0)
        return totalMs / msPerUnit[props.goal.unit]
    })

    // Animation
    const animated = ref(0)
    let frameId: number | null = null

    function animateTo(from: number, to: number) {
        if (frameId) cancelAnimationFrame(frameId)

        const duration = 400
        const startTime = performance.now()
        const easeOut = (t: number) => 1 - (1 - t) ** 3

        function step(now: number) {
            const t = Math.min((now - startTime) / duration, 1)
            animated.value = from + (to - from) * easeOut(t)
            if (t < 1) {
                frameId = requestAnimationFrame(step)
            } else {
                frameId = null
            }
        }

        frameId = requestAnimationFrame(step)
    }

    watch(progress, (to) => {
        animateTo(animated.value, to)
    }, { immediate: true })

    onUnmounted(() => {
        if (frameId) cancelAnimationFrame(frameId)
        if (tickInterval) clearInterval(tickInterval)
    })
</script>

<style scoped>
    .animated-progress {
        height: 0.75rem;
        flex: 1;
        margin: 0;
    }
</style>
