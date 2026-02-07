<template>
<ul id="tracker" class="nolist">
    <li v-if="data.categories.length === 0">
        <p>What habit do you want to track?</p>
        <add-category-form />
    </li>
</ul>
</template>

<script setup lang="ts">
import { useDataStore } from '~/stores/data';

const data = useDataStore();
</script>