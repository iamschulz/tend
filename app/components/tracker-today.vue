<template>
<ul id="tracker" class="nolist">
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
    <li v-for="(entry, index) in data.getAllEntries(true)" :key="index" data-card data-shadow="1-hover" data-fade-in>
        <TrackerEntry :entry="entry" />
    </li>
</ul>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import TrackerEntry from './tracker-entry.vue';

    const data = useDataStore();
</script>

<style scoped>
.tutorial-emoji {
    text-shadow: var(--shadow-color) 0 0 0.5rem;
}

li {
    width: 100%;
    margin-block: 1rem;
}
</style>