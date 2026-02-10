<template>
    <article data-card class="week-entry">
        <span class="icon" v-bind="{ style: `--categoryColor: ${entry.category!.color}`, }">
            {{ entry.category!.activity.emoji }}
        </span>

        <div class="details">
            <time>
                {{ new Date(entry.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
            </time>
            <span v-if="entry.running">
                <nuxt-icon name="play_arrow" /> {{ duration }}
            </span>
            <span v-if="entry.end && (entry.start !== entry.end) && !entry.running">
                {{ formatDuration(entry.start, entry.end) }}
            </span>
        </div>
    </article>
</template>

<script setup lang="ts">
    import type { EntryWithCategory } from '~/types/Category';
    import { formatDuration } from '~/util/formatDuration';

    const props = defineProps<{
        entry: EntryWithCategory,
    }>();

    const now = ref<number>(Date.now())
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
        interval = setInterval(() => {
            now.value = Date.now()
        }, 1000) // update every second
    })
    onUnmounted(() => {
        clearInterval(interval)
    })

    const duration = computed(() => formatDuration(props.entry.start, now.value))
</script>

<style scoped>
    .week-entry {
        display: flex;
        gap: 1rem;
        padding: 0;
    }

    .icon {
        background-color : var(--categoryColor);
        width: 2rem;
        display: grid;
        place-items: center;
        border-radius: var(--br-tl, var(--border-radius)) 0 0 var(--br-bl, var(--border-radius));
    }

    .details {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 1rem 1rem 1rem 0;
    }

    time {
        font-weight: 700;
    }

    span {
        color: var(--col-fg2);
        font-size: 0.9rem;
    }
</style>