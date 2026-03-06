<template>
    <progress :value="animated" :max="props.goal.count" class="animated-progress" :style="color ? { accentColor: color } : undefined">
        {{ progress }} / {{ props.goal.count }}
    </progress>
</template>

<script setup lang="ts">
    import type { Goal } from '~/types/Goal';
    import { useDataStore } from '~/stores/data';
    import { getGoalProgress } from '~/util/getGoalProgress';

    const props = defineProps<{
        goal: Goal
        categoryId: string
    }>()

    const data = useDataStore()
    const color = computed(() => data.getCategoryById(props.categoryId)?.color)

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

    const progress = computed(() =>
        getGoalProgress(props.goal, data.entries, props.categoryId, now.value)
    )

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
