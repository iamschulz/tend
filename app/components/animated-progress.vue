<template>
    <progress :value="animated" :max="max" class="animated-progress" :style="color ? { accentColor: color } : undefined">
        {{ value }} / {{ max }}
    </progress>
</template>

<script setup lang="ts">
    const props = defineProps<{
        value: number
        max: number
        color?: string
    }>()

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

    watch(() => props.value, (to) => {
        animateTo(animated.value, to)
    }, { immediate: true })

    onUnmounted(() => {
        if (frameId) cancelAnimationFrame(frameId)
    })
</script>

<style scoped>
    .animated-progress {
        height: 0.75rem;
        flex: 1;
        margin: 0;
    }
</style>
