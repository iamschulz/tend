<template>
    <button 
        v-if="!data.hasRunningEntries(category)"
        @click="onClick"
        v-bind="{ style: `--categoryColor: ${category.color}`, }"
        oncontextmenu="return false;"
    >
        {{ category.activity.emoji }}
        <span class="sr-only">{{ category.title }}</span>
    </button>
    <button 
        v-else 
        v-bind="{ style: `--categoryColor: ${category.color}`, }"
        @click="data.closeAllEntries(category.id)"
    >
        <nuxt-icon name="stop" />
        <span class="sr-only">Delete</span>
    </button>
</template>

<script setup lang="ts">
    import type { Category, Entry } from '~/types/Category'
    import { useDataStore } from '~/stores/data';

    const props = defineProps<{
        category: Category
    }>()

    const data = useDataStore();

    //const clickThreshold = 500; //ms
    const onClick = () => {
        data.closeAllEntries(props.category.id);
        const now = Date.now();
        const newEntry: Entry = {
            id: crypto.randomUUID(),
            start: now,
            end: now,
            running: false,
            categoryId: props.category.id,
        }
        data.addEntry(newEntry);
    }
</script>

<style scoped>
    @property --progress {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    @keyframes progress-fill {
        20% { --progress: 0; }
        100%   { --progress: 1; }
    }

    button {
        position: relative;
        background-color: var(--categoryColor, --col-accent);
        color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
        width: 100%;
        height: 100%;
        text-shadow: 0px 0px 1rem currentColor;
        user-select: none;

        &::before {
            content: "";
            position: absolute;
            inset: 0;
            border: 4px solid currentColor;
            border-radius: 9999px;
            opacity: 0.7;
            mask-image: conic-gradient(
                from 0deg,
                black 0deg calc(360deg * var(--progress)),
                transparent calc(360deg * var(--progress)) 360deg
            );
        }

        &.loading::before {
            animation: progress-fill 0.8s ease-out forwards;
        }
    }
</style>