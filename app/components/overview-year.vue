<template>
    <div class="year-grid" role="list" :aria-label="yearLabel">
        <div
            v-for="cell in monthCells"
            :key="cell.month"
            ref="months"
            role="listitem"
            :class="{ 'current-month': cell.isCurrentMonth }"
        >
            <YearEntry v-bind="cell" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { getYearRange } from '~/util/getYearRange'
    import { prefersReducedMotion } from '~/util/prefersReducedMotion'
    import { aggregateCategoryCounts, type CategoryCount } from '~/util/aggregateCategoryCounts'

    const { t } = useI18n();

    const props = defineProps<{
        date: Date,
    }>();

    const data = useDataStore();

    const year = props.date.getFullYear();
    const yearLabel = t('yearLabel', { year });

    const yearRange = getYearRange(props.date);
    const entries = computed(() => data.getEntriesForRange(yearRange[0], yearRange[1]));

    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const currentMonthIndex = now.getMonth();

    type MonthCell = {
        month: number;
        dateStr: string;
        isCurrentMonth: boolean;
        entryCount: number;
        ariaLabel: string;
        categories: CategoryCount[];
    };

    const months = ref<HTMLElement[] | null>(null);

    onMounted(async () => {
        if (!isCurrentYear) return;
        await nextTick();
        const currentMonthEl = months.value?.[currentMonthIndex];
        currentMonthEl?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    });

    // Pre-bucket entries by month in one pass — O(E) instead of O(12 × E)
    const entriesByMonth = computed(() => {
        const buckets = new Map<number, typeof entries.value>();
        for (const entry of entries.value) {
            const m = new Date(entry.start).getMonth();
            let bucket = buckets.get(m);
            if (!bucket) {
                bucket = [];
                buckets.set(m, bucket);
            }
            bucket.push(entry);
        }
        return buckets;
    });

    const monthCells = computed<MonthCell[]>(() => {
        const cells: MonthCell[] = [];
        const byMonth = entriesByMonth.value;

        for (let m = 0; m < 12; m++) {
            const monthDate = new Date(year, m, 1);
            const monthEntries = byMonth.get(m) ?? [];

            const categories = aggregateCategoryCounts(monthEntries);

            const mm = String(m + 1).padStart(2, '0');
            const monthName = monthDate.toLocaleDateString(undefined, { month: 'long' });
            const categoryNames = categories.map(c => c.title);
            const entryWord = monthEntries.length === 1 ? t('entry') : t('entries');
            const ariaLabel = monthEntries.length > 0
                ? `${monthName} ${year}, ${monthEntries.length} ${entryWord}: ${categoryNames.join(', ')}`
                : `${monthName} ${year}`;

            cells.push({
                month: m,
                dateStr: `${year}-${mm}`,
                isCurrentMonth: isCurrentYear && m === currentMonthIndex,
                entryCount: monthEntries.length,
                ariaLabel,
                categories,
            });
        }

        return cells;
    });
</script>

<style scoped>
    .year-grid {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        padding: 0 5px 1rem;
        margin-top: 1rem;
        --day-width: 7ch;
        --day-padding: 0.5rem;
        width: 100%;
        gap: 1rem;
    }

    @media (min-width: 26rem) {
        .year-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (min-width: 38rem) {
        .year-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (min-width: 56rem) {
        .year-grid {
            grid-template-columns: repeat(4, 1fr);
        }
    }
</style>
