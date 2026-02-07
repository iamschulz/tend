<template>
    <ul data-group class="nolist">
        <li v-for="(category, index) in data.categories" :key="index" data-avatar data-shadow="2-hover">
            <trigger-button :category="category" />
        </li>
    </ul>
</template>

<script setup lang="ts">
import { useDataStore } from '~/stores/data';

const data = useDataStore();
</script>

<style scoped>
    ul {
        display: flex;
        justify-content: flex-end;
        position: fixed;
        max-width: var(--body-width);
        width: 100%;
        bottom: 2rem;
        margin-left: -1rem;
        padding: 0 1rem;
        z-index: 1;
    }

    [data-avatar] {
        padding: 0;
        font-size: 2rem;
        border: none;
    }
</style>