<template>
    <div class="year-grid" role="list" :aria-label="yearLabel">
        <div
            v-for="cell in monthCells"
            :key="cell.month"
            role="listitem"
            :class="{ 'current-month': cell.isCurrentMonth }"
        >
            <YearEntry v-bind="cell" />
        </div>
    </div>
</template>

<script setup lang="ts">
    import { getYearRange } from '~/util/getYearRange'
    import { getMonthRange } from '~/util/getMonthRange'

    const props = defineProps<{
        date: Date,
    }>();

    const data = useDataStore();

    const year = props.date.getFullYear();
    const yearLabel = `Year ${year}`;

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
        categories: { id: string; title: string; color: string }[];
    };

    const monthCells = computed<MonthCell[]>(() => {
        const cells: MonthCell[] = [];

        for (let m = 0; m < 12; m++) {
            const monthDate = new Date(year, m, 1);
            const [monthStart, monthEnd] = getMonthRange(monthDate);

            const monthEntries = entries.value.filter(entry => {
                const start = new Date(entry.start);
                return start >= monthStart && start <= monthEnd;
            });

            const seen = new Map<string, { id: string; title: string; color: string }>();
            for (const entry of monthEntries) {
                if (entry.category && !seen.has(entry.category.id)) {
                    seen.set(entry.category.id, {
                        id: entry.category.id,
                        title: entry.category.title,
                        color: entry.category.color,
                    });
                }
            }

            const mm = String(m + 1).padStart(2, '0');
            const monthName = monthDate.toLocaleDateString(undefined, { month: 'long' });
            const categoryNames = [...seen.values()].map(c => c.title);
            const ariaLabel = monthEntries.length > 0
                ? `${monthName} ${year}, ${monthEntries.length} ${monthEntries.length === 1 ? 'entry' : 'entries'}: ${categoryNames.join(', ')}`
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
