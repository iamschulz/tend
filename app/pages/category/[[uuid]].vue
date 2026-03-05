<template>
    <div>
    <loading-indicator v-if="!mounted" />
    <section v-else-if="category" class="category-detail">
        <header data-card data-shadow="1">
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
            <button class="delete-button" @click="handleDelete">
                <nuxt-icon name="delete" />
                <span class="sr-only">{{ $t('delete') }}</span>
            </button>
        </header>

        <label for="comment">{{ $t('notes') }}</label>
        <textarea id="comment" v-model="categoryComment" />

        <dl class="stats">
            <div>
                <dt>{{ $t('totalEntries') }}</dt>
                <dd>{{ categoryEntries.length }}</dd>
            </div>
            <div>
                <dt>{{ $t('totalTime') }}</dt>
                <dd>{{ totalTime }}</dd>
            </div>
        </dl>

        <CategoryGoals :category-id="category.id" :goals="category.goals ?? []" />

    </section>
    <ErrorNotice v-else />
    </div>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import { formatDuration } from '~/util/formatDuration';
    import activities from '~/contants/activities.json';

    const route = useRoute()
    const router = useRouter()
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

    const totalTime = computed(() => {
        const now = Date.now()
        const total = categoryEntries.value.reduce((sum, entry) => {
            const end = entry.running ? now : (entry.end ?? entry.start)
            return sum + (end - entry.start)
        }, 0)
        return formatDuration(0, total, t)
    })

    const onActivityChange = (e: Event) => {
        const emoji = (e.target as HTMLSelectElement).value
        const match = activities.find(a => a.emoji === emoji)
        if (category.value && match) data.updateCategory({ id: category.value.id, activity: match })
    }

    const title = ref(category.value?.title ?? '')
    watch(title, (val) => {
        if (category.value && val) data.updateCategory({ id: category.value.id, title: val })
    })

    const handleDelete = async () => {
        if (category.value && await ui.requestConfirm(t('deleteCategory'))) {
            data.deleteCategory(category.value.id)
            announce(`${t('deleted')} ${category.value.title}`)
            router.replace('/')
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
    const mounted = ref(!nuxtApp.isHydrating)

    onNuxtReady(() => {
        mounted.value = true
    })
</script>

<style scoped>
    .category-detail {
        max-width: var(--narrow-width);
        margin: 1rem auto;
    }

    header[data-card] {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        padding: 0 1rem 0 0;

        .title-input {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
            border: none;
            background: none;
            color: inherit;
            min-width: 0;
            flex: 1;
        }
    }

    .delete-button {
        margin: 0;
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

    .icon {
        font-size: 1.6em;
        display: inline-grid;
        place-items: center;
        aspect-ratio: 1;
        height: 4rem;
        border: none;
        border-radius: var(--border-radius) 0 0 var(--border-radius);
        background-color: var(--categoryColor);
        color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
    }

    .stats {
        display: flex;
        gap: 2rem;
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
        }
    }

    textarea {
        display: block;
        width: 100%;
        min-height: 5rem;
        field-sizing: content;
        margin-top: 0;
    }
</style>
