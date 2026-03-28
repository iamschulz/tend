<template>
    <div v-if="goalItems.length" class="wrapper">
        <h2>{{ $t("yourGoalsFor") }} {{ dayLabel }}:</h2>
        <ul class="nolist day-goals">
            <li v-for="item in goalItems" :key="item.key" class="day-goal" :style="{ '--categoryColor': item.color }" data-card data-shadow="1-hover">
                <NuxtLink :to="`/category/${item.categoryId}`" data-card-link />
                <span class="day-goal-category">{{ item.emoji }} {{ item.title }}</span>
                <AnimatedProgress :goal="item.goal" :category-id="item.categoryId" :date="props.date" circular class="day-goal-meter" />
                <nuxt-icon v-if="item.completed" name="crown" filled class="crown" />
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
    import type { Goal } from '~/types/Goal';
    import { useDataStore } from '~/stores/data';
    import { toLocalDateStr } from '~/util/toLocalDateStr';
    import { getGoalProgress } from '~/util/getGoalProgress';

    const props = defineProps<{
        date: Date
    }>()

    const data = useDataStore()
    const { t, locale } = useI18n()

    const now = ref(Date.now())
    const hasRunning = computed(() => data.entries.some(e => e.running))
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

    onUnmounted(() => {
        if (tickInterval) clearInterval(tickInterval)
    })

    const dayLabel = computed(() => {
        const todayStr = toLocalDateStr(new Date())
        const dateStr = toLocalDateStr(props.date)
        if (dateStr === todayStr) return t('today')
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        if (dateStr === toLocalDateStr(yesterday)) return t('yesterday')
        return props.date.toLocaleDateString(locale.value, { weekday: 'long' })
    })

    const dayIndex = computed(() => (props.date.getDay() + 6) % 7)

    const goalItems = computed(() => {
        const items: { key: string; emoji: string; title: string; color: string; categoryId: string; goal: Goal; completed: boolean }[] = []
        for (const cat of data.visibleCategories) {
            for (let gi = 0; gi < (cat.goals?.length ?? 0); gi++) {
                const goal = cat.goals[gi]!
                if (goal.interval !== 'day') continue
                if (!(goal.days & (1 << dayIndex.value))) continue

                const progress = getGoalProgress(goal, data.entries, cat.id, now.value, props.date)
                items.push({
                    key: `${cat.id}:${gi}`,
                    emoji: cat.activity.emoji,
                    title: cat.title,
                    color: cat.color,
                    categoryId: cat.id,
                    goal,
                    completed: progress >= goal.count,
                })
            }
        }
        return items
    })
</script>

<style scoped>
    .wrapper {
        max-width: var(--narrow-width);
        margin: auto;
    }

    [data-card] > * + * {
        margin: 0;
    }

    .day-goals {
        display: flex;
        gap: 1rem;
    }

    .day-goal {
        position: relative;
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .crown {
        position: absolute;
        top: -1.5rem;
        right: -0.8rem;
        font-size: 2rem;
        transform: rotate(20deg);
        color: var(--categoryColor);
        animation: crown-pop var(--animation-duration) var(--animation-bounce);
    }

    @keyframes crown-pop {
        from {
            opacity: 0;
            scale: 0;
        }
    }
</style>
