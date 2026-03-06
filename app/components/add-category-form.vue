<template>
    <div class="categoryForm">
        <form
            data-group
            @submit.prevent="onAddCategory"
        >
            <input v-model="newCategoryData.color" type="color" :aria-label="$t('selectColor')">

            <select v-model="newCategoryData.activity" :aria-label="$t('selectEmoji')" required>
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
                :aria-label="$t('selectCategoryTitle')"
                :placeholder="$t('placeholder')"
                required
            >

            <button type="submit">
                <nuxt-icon name="add" />
                <span class="sr-only">{{ $t('add') }}</span>
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import activities from '~/contants/activities.json'
import colors from '~/contants/colors.json'
import { useDataStore } from '~/stores/data'
import type { CategoryData } from '~/types/CategoryData'
import type { Activity } from '~/types/Activity'

const data = useDataStore()
const { t } = useI18n()
const { announce } = useAnnounce()

/** Picks a random color from the predefined palette. */
const getRandomColor = (): string =>
  colors[Math.floor(Math.random() * colors.length)]!

/** Creates a blank category data object with a random color. */
const createEmptyCategory = (): CategoryData => ({
    title: '',
    color: getRandomColor(),
    activity: activities[0] as Activity // default first activity
})

const newCategoryData = ref<CategoryData>(createEmptyCategory())

/** Adds the new category and resets the form. */
const onAddCategory = () => {
    const title = newCategoryData.value.title
    data.addCategory(newCategoryData.value)
    announce(`${t('added')} ${title}`)

    // Reset form with new random color
    newCategoryData.value = createEmptyCategory()
}
</script>

<style scoped>
    .categoryForm {
        container-name: category-form;
        container-type: inline-size;
        margin-block-start: 1rem;
    }

    input[type="color"] {
        height: 2.2rem;
        min-width: 6ch;
    }

    input[type="text"] {
        max-width: min(17ch, 50vw);
    }

    @container category-form (width < 22rem) {
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