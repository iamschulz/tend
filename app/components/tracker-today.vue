<template>
    <TransitionGroup name="list" tag="ul" class="nolist">
        <div ref="loaderEl" class="loader" />
        <li v-if="data.categories.length === 0">
            <p>What habit do you want to track?</p>
            <add-category-form />
        </li>

        <li v-if="data.categories.length > 0 && data.getAllEntries().length === 0">
            <p>
                Great! You can now start tracking by clicking the <span class="tutorial-emoji" :style="`--shadow-color: ${data.categories[0]!.color}`">{{ data.categories[0]!.activity.emoji }}</span>-Button down below.<br>
                Hold the button to start a timed tracker.
            </p>
            <p>You can add more categories in the menu.</p>
        </li>

        <!-- display all entries from today -->
        <li v-for="(entry) in data.getAllEntries(true)" :key="entry.id">
            <TrackerEntry :entry="entry" />
        </li>
    </TransitionGroup>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import TrackerEntry from './tracker-entry.vue';

    const data = useDataStore();

    const loaderEl = ref<HTMLDialogElement | null>(null)

    onMounted(() => {
        requestAnimationFrame(() => {
            loaderEl.value?.classList.add('mounted')
        })
    })
</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
    }

    .list-enter-from {
        opacity: 0;
        transform: translateY(30px);
        z-index: 2;
    }
    .list-leave-to {
        opacity: 0;
        transform: translateY(0);
        scale: 0.9;
        z-index: 0;
    }
    .list-leave-active {
        position: absolute;
        left: 0;
    }

    .tutorial-emoji {
        text-shadow: var(--shadow-color) 0 0 0.5rem;
    }

    ul {
        position: relative;
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        opacity: 0;
        transform: translateY(1rem);

        &:has(.loader.mounted) {
            opacity: 1;
            transform: translateY(0);
        }
    }

    li {
        width: 100%;
        margin-block: 1rem;
        z-index: 1;
    }
</style>