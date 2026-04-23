<template>
    <loading-indicator v-if="!mounted" />
    <section v-else-if="entry" data-card data-shadow="1" :style="{ viewTransitionName: `entry-card-${entry.id}` }">
        <header>
            <NuxtLink :to="`/category/${entry.category!.id}`" class="icon" :style="{ '--categoryColor': entry.category!.color }">
                {{ entry.category!.activity.emoji }}
            </NuxtLink>
            <h2 class="title">
                {{ entry.category!.title }}
            </h2>
            <button @click="handleDelete">
                <nuxt-icon name="delete" />
                <span class="sr-only">{{ $t('delete') }} {{ entry.category?.title }}</span>
            </button>
        </header>
        <div class="details">
            <time>
                {{ new Date(entry.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
            </time>
            <span v-if="entry.running" class="running-icon">
                <nuxt-icon name="play_arrow" />
                <span class="sr-only">{{ $t("runningFor") }}</span>
            </span>
            <span v-if="entry.running">
                ({{ duration }})
            </span>
            <span v-if="entry.end && (entry.start !== entry.end) && !entry.running">
                ({{ formatDuration(entry.start, entry.end, t) }})
            </span>
        </div>
        
        <div class="controls">
            <label>
                {{ $t("started") }}:
                <input type="datetime-local" :value="startDate" :max="maxDate" @input="onStartDateChange">
            </label>

            <label v-if="!entry.running && entry.end" class="entry-date">
                {{ $t("stopped") }}:
                <input type="datetime-local" :value="endDate" :min="startDate" :max="maxDate" @input="onEndDateChange">
            </label>
            <button v-if="entry.running" data-variant="primary" @click="stopEntry">
                <nuxt-icon name="stop" />
                <span class="sr-only">{{ $t("stop") }}</span>
            </button>
        </div>
        <label for="comment">{{ $t("notes") }}:</label>
        <textarea id="comment" v-model="comment" maxlength="5000" />
    </section>
    <ErrorNotice v-else />
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import { formatDuration } from '~/util/formatDuration';
    import { useSharedNow } from '~/composables/useSharedNow';
    import { toDatetimeLocalStr } from '~/util/toDatetimeLocalStr';

    const route = useRoute()
    const data = useDataStore()
    const ui = useUiStore()
    const { t } = useI18n();
    const now = useSharedNow()

    const uuid = computed(() => {
        const u = route.params.uuid
        return typeof u === 'string' ? u : null
    })

    const entry = computed(() => {
        if (!uuid.value) return null
        const raw = data.entries.find(e => e.id === uuid.value)
        if (!raw) return null
        return {
            ...raw,
            category: data.getCategoryById(raw.categoryId),
        }
    })

    const comment = ref(entry.value?.comment ?? '')

    watch(comment, (val) => {
        if (uuid.value) {
            data.updateEntry(uuid.value, { comment: val })
        }
    })
    
    const startDate = computed(() => {
        if (!entry.value) return ''
        return toDatetimeLocalStr(new Date(entry.value.start))
    })

    const maxDate = computed(() => toDatetimeLocalStr(new Date()))

    /** @param e - The input event from the start date picker */
    function onStartDateChange(e: Event) {
        const value = (e.target as HTMLInputElement).value
        if (!value || !uuid.value || !entry.value) return
        const max = Date.now()
        const ts = Math.min(new Date(value).getTime(), max)
        if (isNaN(ts)) return
        const update: { start: number, end?: number } = { start: ts }
        if (entry.value.end === entry.value.start) {
            update.end = ts
        } else if (entry.value.end && entry.value.end < ts) {
            update.end = ts
        }
        data.updateEntry(uuid.value, update)
    }

    const endDate = computed(() => {
        if (!entry.value?.end) return ''
        return toDatetimeLocalStr(new Date(entry.value.end))
    })

    /** @param e - The input event from the end date picker */
    function onEndDateChange(e: Event) {
        const value = (e.target as HTMLInputElement).value
        if (!value || !uuid.value || !entry.value) return
        const max = Date.now()
        const ts = new Date(value).getTime()
        if (isNaN(ts)) return
        data.updateEntry(uuid.value, { end: Math.min(Math.max(ts, entry.value.start), max) })
    }

    /** Stops the running entry. */
    function stopEntry() {
        if (uuid.value) data.closeEntry(uuid.value)
    }

    /** Prompts for confirmation then deletes the entry. */
    const handleDelete = async () => {
        if (await ui.requestConfirm(t('deleteEntry'))) {
            data.deleteEntry(entry.value!.id)
            navigateTo(`/`); // todo: navigate to day of event
        }
    }

    useHead({ title: computed(() => `${entry.value?.category?.title} | `) })

    const duration = computed(() => formatDuration(entry.value!.start, now.value, t))

    const nuxtApp = useNuxtApp()
    const mounted = ref(import.meta.client && !nuxtApp.isHydrating)

    onNuxtReady(() => {
        mounted.value = true
    })
</script>

<style scoped>
    @keyframes running-entry {
        0% {
            transform: translateX(-0.2rem);
            opacity: 0.1;
        }

        50% {
            opacity: 1;
        }

        100% {
            transform: translateX(0.2rem);
            opacity: 0;
        }
    }

    [data-card] {
        display: block;
        margin: 1rem auto;

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
                border-radius: var(--border-radius) 0 0;
                background-color: var(--categoryColor);
                text-decoration: none;
            }

            h2 {
                display: inline-block;
                flex: 1 0 auto;
            }

        }

        .running-icon {
            animation: running-entry 1s ease-out infinite;
            display: inline-block;
        }

        .controls {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: flex-end;
            margin-bottom: 1rem;

            label {
                display: flex;
                flex-direction: column;
            }

            button {
                border: 1px solid var(--col-accent);
            }
        }

        textarea {
            display: block;
            width: 100%;
            min-height: 5rem;
            margin-top: 0;
        }
    }
</style>
