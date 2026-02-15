<template>
    <form
        class="categoryForm"
        data-group
        @submit.prevent="onAddCategory"
    >
        <input v-model="newCategoryData.color" type="color">

        <select v-model="newCategoryData.activity" required>
            <option
                v-for="activity in activities"
                :key="activity.title"
                :value="activity"
            >
                {{ activity.emoji }}
            </option>
            </select>

        <input
            v-model="newCategoryData.title"
            type="text"
            :placeholder="$t('placeholder')"
            required
        >

        <button type="submit">
            <nuxt-icon name="add" />
            <span class="sr-only">{{ $t('add') }}</span>
        </button>
    </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import activities from '~/contants/activities.json'
import colors from '~/contants/colors.json'
import { useDataStore } from '~/stores/data'
import type { CategoryData, Activity } from '~/types/Category'

const data = useDataStore()

const getRandomColor = (): string =>
  colors[Math.floor(Math.random() * colors.length)]!

// Factory function for clean resets
const createEmptyCategory = (): CategoryData => ({
    title: '',
    color: getRandomColor(),
    activity: activities[0] as Activity // default first activity
})

const newCategoryData = ref<CategoryData>(createEmptyCategory())

const onAddCategory = () => {
    data.addCategory(newCategoryData.value)

    // Reset form with new random color
    newCategoryData.value = createEmptyCategory()
}
</script>

<style scoped>
input[type="color"] {
    height: 2.2rem;
}

input[type="text"] {
        max-width: min(16ch, 50vw);
}
</style>