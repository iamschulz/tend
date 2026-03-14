<template>
    <div class="first-steps">
        <div v-if="!hasCategories">
            <h2 class="welcome" >Hi!<TendIcon /></h2>
            <p>{{ $t('whatHabit') }}</p>
            <add-category-form />
        </div>

        <div v-if="hasCategories && !hasEntries">
            <p>
                {{ $t('tutorialStart') }} <span class="tutorial-emoji" :style="`--shadow-color: ${data.visibleCategories[0]!.color}`">{{ data.visibleCategories[0]!.activity.emoji }}</span>{{ $t('tutorialButton') }}<br>
                {{ $t('tutorialHold') }}
            </p>
            <p>
                {{ $t('tutorialCategorySettings') }}<br>
                <NuxtLink :href="`/category/${data.visibleCategories[0]!.id}`">{{ $t('tutorialCategoryAction') }}</NuxtLink>
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

<style>
    .first-steps {
        text-align: center;
    }

    .welcome {
        font-size: 3rem;
    }
</style>