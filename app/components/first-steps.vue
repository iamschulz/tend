<template>
    <div>
        <div v-if="!hasCategories">
            <p>{{ $t('whatHabit') }}</p>
            <add-category-form />
        </div>

        <div v-if="hasCategories && !hasEntries">
            <p>
                {{ $t('tutorialStart') }} <span class="tutorial-emoji" :style="`--shadow-color: ${data.visibleCategories[0]!.color}`">{{ data.visibleCategories[0]!.activity.emoji }}</span>{{ $t('tutorialButton') }}<br>
                {{ $t('tutorialHold') }}
            </p>
            <p>{{ $t('tutorialMore') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
    const data = useDataStore();
    defineProps<{
        hasCategories: boolean,
        hasEntries: boolean
    }>()
</script>