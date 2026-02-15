<template>
    <div data-card data-shadow="1-hover" class="month-cell" :class="{ 'current-month': isCurrentMonth }">
        <NuxtLink
            :to="`/month/${dateStr}`"
            class="month-link"
            :aria-label="ariaLabel"
            :aria-current="isCurrentMonth ? 'date' : undefined"
            data-card-link
        >
            <span class="month-name">{{ monthLabel }}</span>
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
    const props = defineProps<{
        month: number;
        dateStr: string;
        isCurrentMonth: boolean;
        entryCount: number;
        ariaLabel: string;
        categories: { id: string; title: string; color: string }[];
    }>();

    const monthLabel = new Date(Date.UTC(2024, props.month, 1)).toLocaleDateString(undefined, { month: 'short' });
</script>

<style scoped>
    .month-cell {
        width: 100%;
        aspect-ratio: 2;
        padding: 0;
    }

    @media (min-width: 26rem) {
        .month-cell {
            aspect-ratio: 1;
        }
    }

    .month-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 1rem 0.5rem;
        text-decoration: none;
    }

    .month-name {
        font-weight: 600;
        font-size: 1rem;
        line-height: 1;
    }

    .current-month .month-name {
        background: var(--col-fg);
        color: var(--col-bg);
        border-radius: var(--border-radius);
        padding: 0.2em 0.5em;
    }

    .dots {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 3px;
    }

    .dot {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        background: var(--dot-color);
    }

    .entry-count {
        font-size: 0.8rem;
        color: var(--col-fg2);
    }
</style>
