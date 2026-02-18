<template>
    <TransitionGroup name="list" tag="ul" class="nolist">
        <li ref="loaderEl" key="loader" class="loader" />
        
        <li v-if="data.hasNoEntries" key="firststeps">
            <FirstSteps 
                :has-categories="data.categories.length > 0"
                :has-entries="data.categories.length > 0 && entries.length > 0"
            />
        </li>

        <li v-else-if="entries.length === 0" key="nothingtoday">{{ $t("nothingToday") }}</li>

        <!-- display all entries from today -->
        <li v-for="(entry, index) in entries" :key="entry.id">
            <TrackerEntry :entry="entry" />
            <div v-if="displayBeforeTime(index)" :key="displayBeforeTime(index)" class="divider">
                <span>{{ displayBeforeTime(index) }}:00</span>
            </div>
        </li>
    </TransitionGroup>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';
    import TrackerEntry from './tracker-entry.vue';
    import { getDayRange } from '~/util/getDayRange';

    const props = defineProps<{
        date?: Date,
    }>()
    const dateRange = getDayRange(props.date || new Date());

    const data = useDataStore();
    const entries = computed(() => data.getEntriesForRange(dateRange[0], dateRange[1]));

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

    const loaderEl = ref<HTMLDialogElement | null>(null)

    onMounted(() => {
        requestAnimationFrame(() => {
            loaderEl.value?.classList.add('mounted')
        })
    })
</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
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
    }

    .tutorial-emoji {
        text-shadow: var(--shadow-color) 0 0 0.5rem;
    }

    ul {
        position: relative;
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        opacity: 0;
        transform: translateY(1rem);

        &:has(.loader.mounted) {
            opacity: 1;
            transform: translateY(0);
        }
    }

    li {
        width: 100%;
        margin-block: 1rem;
        z-index: 1;
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
