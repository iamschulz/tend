<template>
    <article data-card class="week-entry" :aria-label="entryLabel" data-shadow="1-hover">
        <span v-if="entry.category" class="icon" :style="`--categoryColor: ${entry.category.color}`" aria-hidden="true">
            {{ entry.category.activity.emoji }}
        </span>

        <div class="details">
            <time>
                {{ timeStr }}
            </time>
            <span v-if="entry.running">
                <nuxt-icon name="play_arrow" aria-hidden="true" /><span class="sr-only">{{ $t('runningFor') }}</span>{{ duration }}
            </span>
            <span v-if="entry.end && (entry.start !== entry.end) && !entry.running">
                {{ formatDuration(entry.start, entry.end, t) }}
            </span>
        </div>
        <NuxtLink data-card-link :to="`/day/${dateStr}#e-${entry.id}`" :aria-label="entry.category?.title" />
    </article>
</template>

<script setup lang="ts">
    import type { EntryWithCategory } from '~/types/Category';
    import { formatDuration } from '~/util/formatDuration';
    import { useSharedNow } from '~/composables/useSharedNow';

    const { t } = useI18n();

    const props = defineProps<{
        entry: EntryWithCategory,
    }>();

    const now = useSharedNow()

    const duration = computed(() => formatDuration(props.entry.start, now.value, t))

    const dateStr = new Date(props.entry.start).toISOString().slice(0, 10);
    const timeStr = new Date(props.entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const categoryName = props.entry.category?.title ?? 'Unknown';

    const entryLabel = computed(() => {
        if (props.entry.running) {
            return t('entryAtRunning', { category: categoryName, time: timeStr, duration: duration.value });
        }
        if (props.entry.end && props.entry.start !== props.entry.end) {
            return t('entryAtDuration', { category: categoryName, time: timeStr, duration: formatDuration(props.entry.start, props.entry.end, t) });
        }
        return t('entryAt', { category: categoryName, time: timeStr });
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

    [data-card-link] {
        margin: 0;
    }
</style>
