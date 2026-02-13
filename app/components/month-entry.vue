<template>
    <div data-card data-shadow="1-hover" class="day-cell" :class="{ today: isToday }">
        <NuxtLink
            :to="`/day/${dateStr}`"
            class="day-link"
            :aria-label="ariaLabel"
            :aria-current="isToday ? 'date' : undefined"
        >
            <span class="day-number">{{ day }}</span>
            <div v-if="categories.length" class="dots">
                <span
                    v-for="cat in categories"
                    :key="cat.id"
                    class="dot"
                    :style="`--dot-color: ${cat.color}`"
                />
            </div>
            <span v-if="entryCount > 0" class="entry-count">{{ entryCount }}</span>
        </NuxtLink>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        day: number;
        dateStr: string;
        isToday: boolean;
        entryCount: number;
        ariaLabel: string;
        categories: { id: string; title: string; color: string }[];
    }>();
</script>

<style scoped>
    .day-cell {
        aspect-ratio: 1;
        width: 100%;
        height: 100%;
        padding: 0;
    }

    .day-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.4rem 0.2rem;
        height: 100%;
        border-radius: var(--border-radius);
        text-decoration: none;
        color: inherit;

        &:hover {
            background: var(--col-bg2);
        }
    }

    .day-number {
        font-weight: 600;
        font-size: 0.9rem;
        line-height: 1;
        aspect-ratio: 1;
    }

    .today .day-number {
        background: var(--col-fg);
        color: var(--col-bg);
        border-radius: 50%;
        width: 1.6em;
        height: 1.6em;
        display: inline-grid;
        place-items: center;
    }

    .dots {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 3px;
    }

    .dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
        background: var(--dot-color);
    }

    .entry-count {
        font-size: 0.7rem;
        color: var(--col-fg2);
    }
</style>
