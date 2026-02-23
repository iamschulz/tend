<template>
    <div class="categoryForm">
        <form data-group>
            <input v-model="category.color" :aria-label="$t('selectColor')" type="color">
            <select 
                :aria-label="$t('selectEmoji')" 
                :value="category.activity.emoji" 
                required 
                @change="handleActivityChange"
            >
                <option v-for="(activity, index2) in activities" :key="index2" :value="activity.emoji">
                    {{ activity.emoji }}
                </option>
            </select>
            <input v-model="category.title" :aria-label="$t('selectCategoryTitle')" type="text" required>
            <button @click.prevent="category.hidden = !category.hidden">
                <nuxt-icon :name="category.hidden ? 'visibility_off' : 'visibility'" />
                <span class="sr-only">{{ category.hidden ? $t('show') : $t('hide') }}</span>
            </button>
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
    const { announce } = useAnnounce();

    function handleActivityChange(e: Event) {
        const emoji = (e.target as HTMLSelectElement).value
        const match = activities.find(a => a.emoji === emoji)
        if (match) { category.activity = match }
    }

    const handleDelete = async () => {
        if (await ui.requestConfirm(t('deleteCategory'))) {
            data.deleteCategory(category.id)
            announce(`${t('deleted')} ${category.title}`)
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

    @container category-form (width < 22rem) {
        .categoryForm [data-group] {
            display: grid;
            grid-template-columns: 1fr 7ch auto;

            > *, > :is(input, select, button) {
                --br-tl: 0;
                --br-tr: 0;
                --br-bl: 0;
                --br-br: 0;
                width: 100%;
                max-width: none;
            }

            :nth-child(1) { /* color */
                grid-area: 1 / 1;
                --br-tl: var(--border-radius);
            }

            :nth-child(2) { /* emoji */
                grid-area: 1 / 2;
            }

            :nth-child(3) { /* title */
                grid-area: 2 / 1 / 2 / 3;
                --br-bl: var(--border-radius);
            }

            :nth-child(4) { /* hide */
                grid-area: 1 / 3;
                --br-tr: var(--border-radius);
            }

            :nth-child(5) { /* delete */
                grid-area: 2 / 3;
                --br-br: var(--border-radius);
            }
        }
    }
</style>