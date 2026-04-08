<template>
    <div ref="gridEl" class="year-grid" role="grid" :aria-label="yearLabel" @keydown="onGridKeydown">
        <div
            v-for="cell in monthCells"
            :key="cell.month"
            ref="months"
            role="gridcell"
            :class="{ 'current-month': cell.isCurrentMonth }"
        >
            <YearEntry v-bind="cell" :tabindex="cell.dateStr === focusedDate ? 0 : -1" />
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
    const gridEl = ref<HTMLElement | null>(null);

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

    // Grid navigation (roving tabindex + arrow keys)
    const initialFocus = isCurrentYear
        ? monthCells.value[currentMonthIndex]!.dateStr
        : monthCells.value[0]!.dateStr;

    /** Returns the current number of CSS grid columns (varies with viewport width). */
    const getGridCols = () => {
        if (!gridEl.value) return 1;
        return getComputedStyle(gridEl.value).gridTemplateColumns.split(' ').length;
    };

    const { focusedKey: focusedDate, onGridKeydown } = useGridNavigation(
        gridEl,
        () => {
            const cols = getGridCols();
            return monthCells.value.map((cell, i) => ({
                key: cell.dateStr,
                row: Math.floor(i / cols),
                col: i % cols,
            }));
        },
        initialFocus,
    );
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
