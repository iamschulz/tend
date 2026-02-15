<template>
    <form class="categoryForm" data-group>
        <input v-model="category.color" type="color">
        <select v-model="category.activity" required>
            <option v-for="(activity, index2) in activities" :key="index2" :value="activity">
                {{ activity.emoji }}
            </option>
        </select>
        <input v-model="category.title" type="text" required>
        <button @click.prevent="handleDelete">
            <nuxt-icon name="delete" />
            <span class="sr-only">{{ $t('delete') }}</span>
        </button>
    </form>
</template>

<script setup lang="ts">
    import { reactive, watch } from 'vue'
    import type { Category } from '~/types/Category'
    import { useDataStore } from '~/stores/data';
    import activities from '~/contants/activities.json'

    const props = defineProps<{
        category: Category
    }>()
    const category = reactive({ ...props.category })

    watch(category, (updatedCategory: Category) => {
        data.updateCategory(updatedCategory)
    }, { deep: true })

    const data = useDataStore();
    const ui = useUiStore();

    const { t } = useI18n();

    const handleDelete = async () => {
        if (await ui.requestConfirm(t('deleteCategory'))) {
            data.deleteCategory(category.id)
        }
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