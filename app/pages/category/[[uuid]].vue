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
                    v-model="title"
                    class="title-input"
                    type="text"
                    :aria-label="$t('selectCategoryTitle')"
                    maxlength="200"
                    required
                >
            </header>

            <div class="actions">
                <label class="color-label">
                    {{ $t('selectColor') }}
                    <input
                        v-model="categoryColor"
                        class="color-input"
                        type="color"
                    >
                </label>
                
                <button @click="toggleHidden">
                    <nuxt-icon :name="category.hidden ? 'visibility_off' : 'visibility'" />
                    <span class="sr-only">{{ category.hidden ? $t('show') : $t('hide') }}</span>
                </button>

                <button @click="handleDelete">
                    <nuxt-icon name="delete" />
                    <span class="sr-only">{{ $t('delete') }}</span>
                </button>
            </div>

            <label for="comment">{{ $t('notes') }}:</label>
            <textarea id="comment" v-model="categoryComment" maxlength="5000" />

            <dl class="stats" data-autogrid="1/2">
                <div v-if="categoryEntries.length > 0">
                    <dt>{{ $t('totalEntries') }}:</dt>
                    <dd>{{ categoryEntries.length }}</dd>
                </div>
                <div v-if="totalTimeMs > 0">
                    <dt>{{ $t('totalTime') }}:</dt>
                    <dd>{{ totalTime }}</dd>
                    <dd v-if="todayMs > 0">{{ todayTime }} {{ $t('today') }}</dd>
                    <dd v-if="weekMs > 0 && weekMs !== todayMs">{{ weekTime }}  {{ $t('thisWeek') }}</dd>
                    <dd v-if="monthMs > 0 && monthMs !== weekMs">{{ monthTime }}  {{ $t('thisMonth') }}</dd>
                    <dd v-if="yearMs > 0 && yearMs !== monthMs">{{ yearTime }}  {{ $t('thisYear') }}</dd>
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

    /**
     * Calculates total duration in ms for entries whose start falls within [from, to).
     * @param from - Range start timestamp (inclusive)
     * @param to - Range end timestamp (exclusive)
     */
    const timeInRange = (from: number, to: number) =>
        categoryEntries.value.reduce((sum, entry) => {
            if (entry.start < from || entry.start >= to) return sum
            const end = entry.running ? now.value : (entry.end ?? entry.start)
            return sum + (end - entry.start)
        }, 0)

    const totalTimeMs = computed(() => categoryEntries.value.reduce((sum, entry) => {
        const end = entry.running ? now.value : (entry.end ?? entry.start)
        return sum + (end - entry.start)
    }, 0))

    const todayMs = computed(() => {
        const d = new Date(now.value)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        return timeInRange(start, start + 86_400_000)
    })

    const weekMs = computed(() => {
        const d = new Date(now.value)
        const day = d.getDay() || 7
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1).getTime()
        return timeInRange(start, start + 7 * 86_400_000)
    })

    const monthMs = computed(() => {
        const d = new Date(now.value)
        const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
        return timeInRange(start, end)
    })

    const yearMs = computed(() => {
        const d = new Date(now.value)
        const start = new Date(d.getFullYear(), 0, 1).getTime()
        const end = new Date(d.getFullYear() + 1, 0, 1).getTime()
        return timeInRange(start, end)
    })

    const totalTime = computed(() => formatDuration(0, totalTimeMs.value, t))
    const todayTime = computed(() => formatDuration(0, todayMs.value, t))
    const weekTime = computed(() => formatDuration(0, weekMs.value, t))
    const monthTime = computed(() => formatDuration(0, monthMs.value, t))
    const yearTime = computed(() => formatDuration(0, yearMs.value, t))

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
        if (!category.value) return
        const nowHidden = !category.value.hidden
        data.updateCategory({ id: category.value.id, hidden: nowHidden })
        announce(t(nowHidden ? 'categoryHidden' : 'categoryShown'))
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
                font-size: 1.4em;
                display: inline-grid;
                place-items: center;
                height: 4rem;
                border: none;
                border-radius: var(--border-radius) 0 0;
                background-color: var(--categoryColor);
                color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
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

        .actions {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin: 0.5rem 0;

            button {
                margin-left: auto;

                & + button {
                    margin-left: 0;
                }
            }
        }

        .color-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
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
