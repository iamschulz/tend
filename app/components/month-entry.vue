<template>
    <div data-card data-shadow="1-hover" class="day-cell" :class="{ today: isToday }">
        <NuxtLink
            :to="`/day/${dateStr}`"
            class="day-link"
            :aria-label="ariaLabel"
            :aria-current="isToday ? 'date' : undefined"
            data-card-link
        >
            <span class="day-number">{{ day }}</span>
            <div v-if="categories.length" class="dots">
                <CategoryDot
                    v-for="cat in categories"
                    :key="cat.id"
                    :color="cat.color"
                    :count="cat.count"
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
        categories: { id: string; title: string; color: string; count: number }[];
    }>();
</script>

<style scoped>
    .day-cell {
        aspect-ratio: 1;
        width: 100%;
        margin-bottom: -6px;
        padding: 0;
    }

    .day-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        text-decoration: none;
        padding: 0.5rem;
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

    .entry-count {
        font-size: 0.7rem;
        color: var(--col-fg2);
    }
</style>
