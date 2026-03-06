<template>
    <div>
    <loading-indicator v-if="!mounted" />
    <template v-else-if="category">
        <section data-card data-shadow="1" class="category">
            <header>
                <select
                    class="icon"
                    :style="{ '--categoryColor': categoryColor }"
                    :aria-label="$t('selectEmoji')"
                    :value="category.activity.emoji"
                    @change="onActivityChange"
                >
                    <option v-for="activity in activities" :key="activity.emoji" :value="activity.emoji">
                        {{ activity.emoji }}
                    </option>
                </select>
                <input
                    v-model="categoryColor"
                    class="color-input"
                    type="color"
                    :aria-label="$t('selectColor')"
                >
                <input
                    v-model="title"
                    class="title-input"
                    type="text"
                    :aria-label="$t('selectCategoryTitle')"
                    required
                >
                <button @click="toggleHidden">
                    <nuxt-icon :name="category.hidden ? 'visibility_off' : 'visibility'" />
                    <span class="sr-only">{{ category.hidden ? $t('show') : $t('hide') }}</span>
                </button>
                <button @click="handleDelete">
                    <nuxt-icon name="delete" />
                    <span class="sr-only">{{ $t('delete') }}</span>
                </button>
            </header>

            <label for="comment">{{ $t('notes') }}:</label>
            <textarea id="comment" v-model="categoryComment" />

            <dl class="stats" data-autogrid="1/2">
                <div>
                    <dt>{{ $t('totalEntries') }}:</dt>
                    <dd>{{ categoryEntries.length }}</dd>
                </div>
                <div>
                    <dt>{{ $t('totalTime') }}:</dt>
                    <dd>{{ totalTime }}</dd>
                </div>
            </dl>
        </section>
        <section data-card data-shadow="1">
            <header><h3>{{ $t('goals') }}</h3></header>
            <CategoryGoals :category-id="category.id" :goals="category.goals ?? []" />
        </section>
    </template>
    <ErrorNotice v-else />
    </div>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import { formatDuration } from '~/util/formatDuration';
    import activities from '~/contants/activities.json';
    import { useSharedNow } from '~/composables/useSharedNow';

    const route = useRoute()
    const data = useDataStore()
    const ui = useUiStore()
    const { t } = useI18n()
    const { announce } = useAnnounce()

    const uuid = computed(() => {
        const u = route.params.uuid
        return typeof u === 'string' ? u : null
    })

    const category = computed(() => {
        if (!uuid.value) return null
        return data.getCategoryById(uuid.value) ?? null
    })

    const categoryEntries = computed(() => {
        if (!category.value) return []
        return data.entries
            .filter(e => e.categoryId === category.value!.id)
            .map(e => ({ ...e, category: category.value ?? undefined }))
            .sort((a, b) => b.start - a.start)
    })

    const now = useSharedNow()

    const totalTime = computed(() => {
        const total = categoryEntries.value.reduce((sum, entry) => {
            const end = entry.running ? now.value : (entry.end ?? entry.start)
            return sum + (end - entry.start)
        }, 0)
        return formatDuration(0, total, t)
    })

    /** @param e - The change event from the activity select */
    const onActivityChange = (e: Event) => {
        const emoji = (e.target as HTMLSelectElement).value
        const match = activities.find(a => a.emoji === emoji)
        if (category.value && match) data.updateCategory({ id: category.value.id, activity: match })
    }

    const title = ref(category.value?.title ?? '')
    watch(title, (val) => {
        if (category.value && val) data.updateCategory({ id: category.value.id, title: val })
    })

    /** Toggles the category's hidden state. */
    const toggleHidden = () => {
        if (category.value) data.updateCategory({ id: category.value.id, hidden: !category.value.hidden })
    }

    /** Prompts for confirmation then deletes the category. */
    const handleDelete = async () => {
        if (category.value && await ui.requestConfirm(t('deleteCategory'))) {
            const { id, title: categoryTitle } = category.value
            await navigateTo('/')
            data.deleteCategory(id)
            announce(`${t('deleted')} ${categoryTitle}`)
        }
    }

    const categoryColor = ref(category.value?.color ?? '#888888')
    watch(categoryColor, (val) => {
        if (category.value) data.updateCategory({ id: category.value.id, color: val })
    })

    const categoryComment = ref(category.value?.comment ?? '')
    watch(categoryComment, (val) => {
        if (category.value) data.updateCategory({ id: category.value.id, comment: val })
    })

    useHead({ title: computed(() => `${category.value?.title} | `) })

    const nuxtApp = useNuxtApp()
    const mounted = ref(import.meta.client && !nuxtApp.isHydrating)

    onNuxtReady(() => {
        mounted.value = true
    })
</script>

<style scoped>
    [data-card] {
        display: block;
        margin: 1rem auto;
    }
    
    .category {
        header {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0 1rem 0 0;

            .icon {
                flex: 0 0 auto;
                font-size: 1.6em;
                display: inline-grid;
                place-items: center;
                aspect-ratio: 1;
                height: 4rem;
                border: none;
                border-radius: var(--border-radius) 0 0;
                background-color: var(--categoryColor);
                color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
            }

            .color-input {
                height: 2.2rem;
                width: 2.2rem;
                margin: 0;
                padding: 0.2rem;
                border: none;
                background: none;
                cursor: pointer;
            }

            .title-input {
                margin: 0;
                padding: 0;
                font-size: 1.5rem;
                font-weight: 700;
                border: none;
                border-bottom: 1px solid transparent;
                background: none;
                color: inherit;
                min-width: 0;
                flex: 1;
                border-radius: 0;

                &:hover {
                    border-bottom: 1px solid currentColor;
                }
            }
        }

        .stats {
            margin: 1rem 0;

            div {
                flex: 1;
            }

            dt {
                font-size: 0.85rem;
                color: var(--col-fg3);
            }

            dd {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 700;
                
                &::before {
                    display: none;
                }
            }
        }

        textarea {
            display: block;
            width: 100%;
            min-height: 5rem;
            field-sizing: content;
            margin-top: 0;
        }
    }
</style>
