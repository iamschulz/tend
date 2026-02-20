<template>
    <div class="categoryForm">
        <form data-group>
            <input v-model="category.color" type="color">
            <select :value="category.activity.emoji" required @change="handleActivityChange">
                <option v-for="(activity, index2) in activities" :key="index2" :value="activity.emoji">
                    {{ activity.emoji }}
                </option>
            </select>
            <input v-model="category.title" type="text" required>
            <button @click.prevent="handleDelete">
                <nuxt-icon name="delete" />
                <span class="sr-only">{{ $t('delete') }}</span>
            </button>
        </form>
    </div>
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

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    watch(category, (updatedCategory: Category) => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => data.updateCategory(updatedCategory), 300)
    }, { deep: true })

    const data = useDataStore();
    const ui = useUiStore();

    const { t } = useI18n();

    function handleActivityChange(e: Event) {
        const emoji = (e.target as HTMLSelectElement).value
        const match = activities.find(a => a.emoji === emoji)
        if (match) { category.activity = match }
    }

    const handleDelete = async () => {
        if (await ui.requestConfirm(t('deleteCategory'))) {
            data.deleteCategory(category.id)
        }
    }
</script>

<style scoped>
    .categoryForm {
        container-name: category-form;
        container-type: inline-size;
    }

    input[type="color"] {
        height: 2.2rem;
    }

    input[type="text"] {
            max-width: min(16ch, 50vw);
    }

    @container category-form (width < 19rem) {
        .categoryForm [data-group] {
            display: grid;
            grid-template-columns: 1fr auto;

            > *, > :is(input, select, button) {
                --br-tl: 0;
                --br-tr: 0;
                --br-bl: 0;
                --br-br: 0;
                width: 100%;
                max-width: none;
            }

            :nth-child(1) {
                --br-tl: var(--border-radius);
            }

            :nth-child(2) {
                --br-tr: var(--border-radius);
            }

            :nth-child(3) {
                --br-bl: var(--border-radius);
            }

            :nth-child(4) {
                --br-br: var(--border-radius);
            }
        }
    }
</style>