<template>
    <span class="category-dot" :style="`--categoryColor: ${color}`">{{ count }}</span>
</template>

<script setup lang="ts">
    defineProps<{
        color: string;
        count: number;
    }>();
</script>

<style scoped>
    .category-dot {
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        background: var(--categoryColor);
        color: oklch(from var(--categoryColor) calc(round(l) * -1 + 1) 0 0);
        font-size: 0.6rem;
        font-weight: 600;
        line-height: 1;
    }
</style>
