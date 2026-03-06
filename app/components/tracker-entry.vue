<template>
    <article :id="`e-${entry.id}`" class="track" data-card data-shadow="1-hover" :style="{ viewTransitionName: `entry-card-${entry.id}` }">
        <NuxtLink data-card-link :to="`/entry/${entry.id}`" :aria-label="entry.category?.title" />
        <span class="icon" :style="{ '--categoryColor': entry.category!.color }">
            {{ entry.category!.activity.emoji }}
        </span>
        <h2 class="title">
            {{ entry.category!.title }}
        </h2>
        <div class="details">
            <time>
                {{ new Date(entry.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
            </time>
            <span v-if="entry.running" class="running-icon">
                <nuxt-icon name="play_arrow" />
                <span class="sr-only">{{ $t("runningFor") }}</span>
            </span>
            <span v-if="entry.running">
                ({{ duration }})
            </span>
            <span v-if="entry.end && (entry.start !== entry.end) && !entry.running">
                ({{ formatDuration(entry.start, entry.end, t) }})
            </span>
            <span v-if="entry.comment">
                <nuxt-icon name="notes" />
            </span>
        </div>
        <div class="controls">
            <button v-if="entry.running" @click="handleStop">
                <nuxt-icon name="stop" />
                <span class="sr-only">{{ $t('stop') }} {{ entry.category?.title }}</span>
            </button>
            <button v-else @click="handleDelete">
                <nuxt-icon name="delete" />
                <span class="sr-only">{{ $t('delete') }} {{ entry.category?.title }}</span>
            </button>
        </div>
    </article>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import type { EntryWithCategory } from '~/types/EntryWithCategory';
    import { formatDuration } from '~/util/formatDuration';
    import { useSharedNow } from '~/composables/useSharedNow';

    const { t } = useI18n();
    const data = useDataStore();
    const ui = useUiStore();

    const props = defineProps<{
        entry: EntryWithCategory
    }>()

    const now = useSharedNow()

    const duration = computed(() => formatDuration(props.entry.start, now.value, t))

    /** Stops the running entry. */
    const handleStop = () => {
        data.closeEntry(props.entry.id)
    }

    /** Prompts for confirmation then deletes the entry. */
    const handleDelete = async () => {
        if (await ui.requestConfirm(t('deleteEntry'))) {
            data.deleteEntry(props.entry.id)
        }
    }
</script>

<style scoped>
    @keyframes running-entry {
        0% {
            transform: translateX(-0.2rem);
            opacity: 0.1;
        }

        50% {
            opacity: 1;
        }

        100% {
            transform: translateX(0.2rem);
            opacity: 0;
        }
    }

    .track {
        display: grid;
        grid-template-columns: 4rem auto 4rem;
        grid-template-rows: 1fr 1fr;
        gap: 0 1rem;
        grid-template-areas:
            "icon title controls"
            "icon details controls";
        padding: 0;
    }

    .event {
        font-size: 3rem;
    }

    .icon {
        grid-area: icon;
        display: grid;
        place-items: center;
        font-size: 2.5rem;
        background-color: var(--categoryColor);
        color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
        text-shadow: 0px 0px 1rem currentColor;
        margin: 0;
        padding: 0 0.5rem;
        border-radius: var(--br-tl, var(--border-radius)) 0 0 var(--br-bl, var(--border-radius));
    }

    .title {
        grid-area: title;
        margin-top: 0;
    }

    .details {
        grid-area: details;
        display: flex;
        gap: 1ch;
        margin-block-start: 0;
        margin-block-end: 1rem;

        svg {
            animation: running-entry 1s ease-out infinite;
        }

        time {
            font-weight: 700;
        }
    }

    .running-icon {
        animation: running-entry 1s ease-out infinite;
    }

    .controls {
        grid-area: controls;
        margin: 0;
        display: grid;
        place-items: center;
        z-index: 3;
    }
</style>
