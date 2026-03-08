<template>
    <div data-carousel>
        <table class="month-grid" :aria-label="monthLabel">
            <thead>
                <tr>
                    <th v-for="day in weekdays" :key="day.short" :aria-label="day.full" class="weekday-header">{{ day.short }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(week, wi) in calendarWeeks" :key="wi">
                    <td
                        v-for="(cell, ci) in week"
                        :key="ci"
                        :ref="el => { if (cell?.isToday) todayEl = el as HTMLElement }"
                        :class="{
                            empty: !cell,
                            today: cell?.isToday,
                            'has-entries': cell && cell.categories.length > 0,
                        }"
                    >
                        <MonthEntry v-if="cell" v-bind="cell" />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
    import { getMonthRange } from '~/util/getMonthRange';
    import { getWeekdays } from '~/contants/weekdays';

    const { t } = useI18n();

    const props = defineProps<{
        date: Date,
    }>();

    const data = useDataStore();

    const weekdays = getWeekdays(t);
    const monthLabel = props.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const monthRange = getMonthRange(props.date);
    const entries = computed(() => data.getEntriesForRange(monthRange[0], monthRange[1]));

    type DayCell = {
        day: number;
        dateStr: string;
        isToday: boolean;
        entryCount: number;
        ariaLabel: string;
        categories: { id: string; title: string; color: string; count: number }[];
    };

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Pre-bucket entries by local day in one pass — O(E) instead of O(days × E)
    const entriesByDay = computed(() => {
        const buckets = new Map<number, typeof entries.value>();
        for (const entry of entries.value) {
            const d = new Date(entry.start);
            const day = d.getDate();
            let bucket = buckets.get(day);
            if (!bucket) {
                bucket = [];
                buckets.set(day, bucket);
            }
            bucket.push(entry);
        }
        return buckets;
    });

    const calendarCells = computed<(DayCell | null)[]>(() => {
        const year = props.date.getFullYear();
        const month = props.date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Monday = 0, Sunday = 6
        const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

        const cells: (DayCell | null)[] = Array(firstDayOfWeek).fill(null);
        const byDay = entriesByDay.value;

        for (let day = 1; day <= daysInMonth; day++) {
            const current = new Date(year, month, day);
            const dayEntries = byDay.get(day) ?? [];

            const seen = new Map<string, { id: string; title: string; color: string; count: number }>();
            for (const entry of dayEntries) {
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

            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');

            const dateLabel = current.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            const categoryNames = [...seen.values()].map(c => c.title);
            const entryWord = dayEntries.length === 1 ? t('entry') : t('entries');
            const ariaLabel = dayEntries.length > 0
                ? `${dateLabel}, ${dayEntries.length} ${entryWord}: ${categoryNames.join(', ')}`
                : dateLabel;

            cells.push({
                day,
                dateStr: `${year}-${mm}-${dd}`,
                isToday: `${year}-${mm}-${dd}` === todayStr,
                entryCount: dayEntries.length,
                ariaLabel,
                categories: [...seen.values()],
            });
        }

        return cells;
    });

    const todayEl = ref<HTMLElement | null>(null);

    onMounted(async () => {
        await nextTick();
        todayEl.value?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    });

    const calendarWeeks = computed(() => {
        const cells = calendarCells.value;
        const weeks: (DayCell | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            const week = cells.slice(i, i + 7);
            while (week.length < 7) week.push(null);
            weeks.push(week);
        }
        return weeks;
    });
</script>

<style scoped>
    .month-grid {
        width: 100%;
        padding: 0 5px 1rem;
        --day-width: 14ch;
        --day-padding: 0.5rem;
        min-width: calc((var(--day-width) + var(--day-padding) * 2) * 7);

        > th, td {
            padding: var(--day-padding);
            scroll-snap-align: center;
        }

        tbody tr:nth-child(even) {
            background-color: transparent;
        }
    }

    .weekday-header {
        text-align: center;
        font-weight: 700;
        padding: var(--day-padding) 0;
        color: var(--col-fg2);
        font-size: 0.85rem;
    }

    td.empty {
        pointer-events: none;
    }
</style>
