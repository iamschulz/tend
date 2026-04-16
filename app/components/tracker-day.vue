<template>
    <TransitionGroup name="list" tag="ul" class="nolist entries">
        <li ref="loaderEl" key="loader" class="loader" />
        
        <li v-if="data.hasNoEntries" key="firststeps">
            <FirstSteps
                :has-categories="data.visibleCategories.length > 0"
                :has-entries="data.visibleCategories.length > 0 && entries.length > 0"
            />
        </li>

        <li v-else-if="entries.length === 0" key="nothingtoday" class="empty" data-dashedbox>
            <nuxt-icon name="tend" />
            {{ $t("nothingToday") }}
        </li>

        <!-- display all entries from today -->
        <li v-for="(entry, index) in entries" :key="entry.id">
            <TrackerEntry :entry="entry" />
            <div v-if="displayBeforeTime(index)" :key="displayBeforeTime(index)" class="divider">
                <span>{{ displayBeforeTime(index) }}:00</span>
            </div>
        </li>
    </TransitionGroup>

    <div ref="additionalEl" class="additional-fade">
        <section v-if="!data.hasNoEntries" class="day-notes">
            <h2><label :for="notesId">{{ $t("dayNotes") }}:</label></h2>
            <textarea
                :id="notesId"
                v-model="notes"
                :placeholder="$t('dayNotesPlaceholder')"
                rows="3"
                maxlength="10000"
                data-shadow="1"
            />
        </section>

        <section>
            <DayGoals :date="props.date || new Date()" />
            <DayGoals v-if="isToday" :date="props.date || new Date()" interval="week" />
            <DayGoals v-if="isToday" :date="props.date || new Date()" interval="month" />
        </section>
    </div>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import TrackerEntry from './tracker-entry.vue';
    import { getDayRange } from '~~/shared/utils/dateRanges';
    import { toLocalDateStr } from '~/util/toLocalDateStr';
    import { prefersReducedMotion } from '~/util/prefersReducedMotion';
    const props = defineProps<{
        date?: Date,
    }>()
    const dateRange = getDayRange(props.date || new Date());
    const isToday = computed(() => toLocalDateStr(props.date || new Date()) === toLocalDateStr(new Date()))

    const data = useDataStore();
    const entries = computed(() => data.getEntriesForRange(dateRange[0], dateRange[1]));

    // --- Daily notes -------------------------------------------------------
    const dateStr = computed(() => toLocalDateStr(props.date || new Date()))
    const notesId = computed(() => `day-notes-${dateStr.value}`)

    /** Local draft bound to the textarea; seeded from the store (possibly from idb cache). */
    const notes = ref(data.getDayNotes(dateStr.value))

    let saveTimer: ReturnType<typeof setTimeout> | null = null
    /** Set immediately before any programmatic assignment to `notes` so the save watcher skips it. */
    let programmaticUpdate = false
    /** True once the user has typed in this session; prevents an async server load from clobbering their input. */
    let userHasEdited = false

    // Pull the latest notes for this date from the server (server mode only).
    // The store → local watcher below will pick up the result.
    if (import.meta.client) {
        data.loadDay(dateStr.value)
    }

    // Store → local: reactively sync the textarea to the store.
    // Covers (a) pinia-persist hydration that lands after setup,
    // (b) server-mode `loadDay` resolving, (c) external writes.
    // The `userHasEdited` guard prevents clobbering in-progress user input.
    watch(
        () => data.getDayNotes(dateStr.value),
        (fromStore) => {
            if (userHasEdited) return
            if (notes.value === fromStore) return
            programmaticUpdate = true
            notes.value = fromStore
        },
        { immediate: true },
    )

    // Local → store/server: debounce writes so we don't sync on every keystroke.
    watch(notes, (val) => {
        if (programmaticUpdate) {
            programmaticUpdate = false
            return
        }
        userHasEdited = true
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
            saveTimer = null
            data.updateDayNotes(dateStr.value, val)
        }, 400)
    })

    onBeforeUnmount(() => {
        // Flush any pending debounced save so nothing is lost on navigation.
        if (saveTimer) {
            clearTimeout(saveTimer)
            saveTimer = null
            data.updateDayNotes(dateStr.value, notes.value)
        }
    })

    /** @param index - Entry index; returns the hour if it differs from the next entry's hour */
    const displayBeforeTime = (index: number): number | undefined => {
        const entry = entries.value[index]!;
        const hour = new Date(entry.start).getHours();

        const prev = entries.value[index + 1];
        if (!prev) {
            return;
        }

        const prevHour = new Date(prev.start).getHours();

        if (hour !== prevHour) {
            return hour;
        }
    }

    const { t } = useI18n()
    const { watchForAdd, watchForStop, watchForDelete } = useAnnounce()

    /** @param entry - The entry to format as an announcement string */
    const formatEntry = (entry: typeof entries.value[number]) => {
        const time = new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return t('entryAt', { category: entry.category?.title, time })
    }

    watchForAdd(entries, (entry) => {
        const time = new Date(entry.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return t(entry.running ? 'entryAtRunning' : 'entryAt', { category: entry.category?.title, time, duration: '' })
    })
    watchForStop(entries, (entry) => `${t('stopped')} ${formatEntry(entry)}`)
    watchForDelete(entries, (entry) => `${t('deleted')} ${formatEntry(entry)}`)

    const loaderEl = ref<HTMLDialogElement | null>(null)
    const additionalEl = ref<HTMLDivElement | null>(null)

    const route = useRoute()
    const ui = useUiStore()

    onMounted(() => {
        if (ui.skipListFadeIn) {
            // Skip the list fade-in but preserve entry add animation
            const ul = loaderEl.value?.parentElement
            ul?.classList.add('skip-fade-in')
            loaderEl.value?.classList.add('mounted')
            ui.skipListFadeIn = false

            // Flush pending entry after mount so TransitionGroup sees it as new
            if (ui.pendingEntry) {
                const { entry, closeCategoryId } = ui.pendingEntry
                ui.pendingEntry = null
                nextTick(() => {
                    data.closeAllEntries(closeCategoryId)
                    data.addEntry(entry)
                })
            }
        } else {
            requestAnimationFrame(() => {
                loaderEl.value?.classList.add('mounted')
            })
        }
        requestAnimationFrame(() => {
            additionalEl.value!.classList?.add('mounted')
        })
        if (route.hash) {
            nextTick(() => {
                const behavior = prefersReducedMotion() ? 'instant' : 'smooth';
                document.querySelector(route.hash)?.scrollIntoView({ behavior })
            })
        }
    })

</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
        transition-timing-function: var(--animation-bounce);
    }

    .list-enter-from {
        opacity: 0;
        transform: translateY(30px);
        z-index: 2;
    }
    .list-leave-to {
        opacity: 0;
        transform: translateY(0);
        scale: 0.9;
        z-index: 0;
    }
    .list-leave-active {
        position: absolute;
        left: 0;
        right: 0;
    }

    .tutorial-emoji {
        text-shadow: var(--shadow-color) 0 0 0.5rem;
    }

    .entries {
        position: relative;
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        opacity: 0;
        transform: translateY(1rem);

        &:has(.loader.mounted) {
            opacity: 1;
            transform: translateY(0);
        }

        &.skip-fade-in {
            --t-opacity: 0s;
            --t-transform: 0s;
        }
    }

    li {
        width: 100%;
        max-width: var(--narrow-width);
        margin-block: 1rem;
        margin-inline: auto;
        z-index: 1;
    }

    .empty {
        .nuxt-icon {
            font-size: 2rem;
        }
    }

    .additional-fade {
        opacity: 0;
        transform: translateY(1rem);
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);

        &.mounted {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .day-notes {
        width: 100%;
        max-width: var(--narrow-width);
        margin: 1rem auto;

        textarea {
            width: 100%;
            font: inherit;
            padding: 0.75rem;
            border-radius: var(--border-radius);
            border: 1px solid var(--col-bg3);
            background: var(--col-bg2);
            color: var(--col-fg1);
            resize: vertical;
            min-height: 4rem;
        }
    }

    .divider {
        margin-block: 1rem;
        text-align: center;
        display: flex;
        align-items: center;
        gap: 1rem;

        span {
            flex: 1 0 auto;
            color: var(--col-fg3);
        }

        &::before, &::after {
            content: "";
            background: var(--col-bg3);
            flex: 0 1 100%;
            height: 3px;
            border-radius: 9999px;
        }
    }
</style>
