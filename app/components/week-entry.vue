<template>
    <article data-card class="week-entry" :aria-label="entryLabel">
        <span v-if="entry.category" class="icon" :style="`--categoryColor: ${entry.category.color}`" aria-hidden="true">
            {{ entry.category.activity.emoji }}
        </span>

        <div class="details">
            <time>
                {{ timeStr }}
            </time>
            <span v-if="entry.running">
                <nuxt-icon name="play_arrow" aria-hidden="true" /><span class="sr-only">running for </span>{{ duration }}
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

    const timeStr = new Date(props.entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const categoryName = props.entry.category?.title ?? 'Unknown';

    const entryLabel = computed(() => {
        if (props.entry.running) {
            return `${categoryName} at ${timeStr}, running for ${duration.value}`;
        }
        if (props.entry.end && props.entry.start !== props.entry.end) {
            return `${categoryName} at ${timeStr}, ${formatDuration(props.entry.start, props.entry.end)}`;
        }
        return `${categoryName} at ${timeStr}`;
    })
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