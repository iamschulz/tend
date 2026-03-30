<template>
    <svg v-if="circular" class="animated-progress-circular" viewBox="0 0 36 36" :style="cssVars">
        <circle class="circular-track" cx="18" cy="18" :r="radius" />
        <circle class="circular-fill" cx="18" cy="18" :r="radius" :stroke-dasharray="circumference" :stroke-dashoffset="dashOffset" />
        <text x="18" y="18" class="circular-text">{{ Math.floor(percentage) }}%</text>
    </svg>
    <progress v-else :value="animated" :max="props.goal.count" class="animated-progress" :style="color ? { accentColor: color } : undefined">
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
        date?: Date
        circular?: boolean
    }>()

    const data = useDataStore()
    const color = computed(() => data.getCategoryById(props.categoryId)?.color)

    const now = ref(Date.now())
    const hasRunning = computed(() => data.entries.some(e => e.categoryId === props.categoryId && e.running))
    let tickInterval: ReturnType<typeof setInterval> | null = null

    watch(hasRunning, (running) => {
        now.value = Date.now()
        if (running && !tickInterval) {
            tickInterval = setInterval(() => { now.value = Date.now() }, 1000)
        } else if (!running && tickInterval) {
            clearInterval(tickInterval)
            tickInterval = null
        }
    }, { immediate: true })

    const progress = computed(() =>
        getGoalProgress(props.goal, data.entries, props.categoryId, now.value, props.date)
    )

    // Circular meter
    const radius = 15.5
    const circumference = 2 * Math.PI * radius
    const percentage = computed(() => Math.max(0, Math.min((animated.value / props.goal.count) * 100, 100)))
    const dashOffset = computed(() => circumference - (percentage.value / 100) * circumference)
    const cssVars = computed(() => ({
        '--circle-color': color.value || 'var(--col-fg)',
    }))

    // Animation
    const animated = ref(0)
    let frameId: number | null = null

    /**
     * Animates the progress bar between two values.
     * @param from - The starting value
     * @param to - The target value
     */
    function animateTo(from: number, to: number) {
        if (frameId) cancelAnimationFrame(frameId)

        const duration = 400
        const startTime = performance.now()
        /** @param t - Normalized time (0-1) */
        const easeOut = (t: number) => 1 - (1 - t) ** 3

        /** @param now - The current timestamp from requestAnimationFrame */
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

    .animated-progress-circular {
        width: 3.5rem;
        height: 3.5rem;
        transform: rotate(-90deg);
    }

    .circular-track {
        fill: none;
        stroke: var(--col-bg3, #e0e0e0);
        stroke-width: 3;
    }

    .circular-fill {
        fill: none;
        stroke: var(--circle-color);
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.1s ease-out;
    }

    .circular-text {
        fill: var(--col-fg);
        font-size: 0.55rem;
        font-weight: 700;
        text-anchor: middle;
        dominant-baseline: central;
        transform: rotate(90deg);
        transform-origin: 18px 18px;
    }
</style>
