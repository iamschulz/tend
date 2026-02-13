<template>
    <article class="track" data-card data-shadow="1-hover">
        <span class="icon" v-bind="{ style: `--categoryColor: ${entry.category!.color}`, }">
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
            </span>
            <span v-if="entry.running">
                ({{ duration }})
            </span>
            <span v-if="entry.end && (entry.start !== entry.end) && !entry.running">
                ({{ formatDuration(entry.start, entry.end) }})
            </span>
        </div>
        <div class="controls">
            <button @click="data.deleteEntry(entry.id)">
                <nuxt-icon name="delete" />
                <span class="sr-only">Delete</span>
            </button>
        </div>
    </article>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import type { EntryWithCategory } from '~/types/Category';
    import { formatDuration } from '~/util/formatDuration';

    const data = useDataStore();

    const props = defineProps<{
        entry: EntryWithCategory
    }>()

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
@keyframes running-entry {
        0% {
            transform: translateX(0.2rem);
            opacity: 0.1;
        }

        50% {
            opacity: 1;
        }

        100% {
            transform: translateX(-0.2rem);
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
    }
</style>