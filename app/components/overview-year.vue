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
        categories: { id: string; title: string; color: string; count: number }[];
    };

    const months = ref<HTMLElement[] | null>(null);

    onMounted(async () => {
        if (!isCurrentYear) return;
        await nextTick();
        const currentMonthEl = months.value?.[currentMonthIndex];
        currentMonthEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

            const seen = new Map<string, { id: string; title: string; color: string; count: number }>();
            for (const entry of monthEntries) {
                if (entry.category) {
                    const existing = seen.get(entry.category.id);
                    if (existing) {
                        existing.count++;
                    } else {
                        seen.set(entry.category.id, {
                            id: entry.category.id,
                            title: entry.category.title,
                            color: entry.category.color,
                            count: 1,
                        });
                    }
                }
            }

            const mm = String(m + 1).padStart(2, '0');
            const monthName = monthDate.toLocaleDateString(undefined, { month: 'long' });
            const categoryNames = [...seen.values()].map(c => c.title);
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
                categories: [...seen.values()],
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
