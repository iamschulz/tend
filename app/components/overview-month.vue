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

    <DayGoals ref="monthGoalsEl" :date="props.date" interval="month" class="month-goals-fade" />
</template>

<script setup lang="ts">
    import { getMonthRange } from '~/util/getMonthRange';
    import { getWeekdays } from '~/contants/weekdays';
    import { prefersReducedMotion } from '~/util/prefersReducedMotion';
    import { toLocalDateStr } from '~/util/toLocalDateStr';
    import { aggregateCategoryCounts, type CategoryCount } from '~/util/aggregateCategoryCounts';

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
        categories: CategoryCount[];
    };

    const todayStr = toLocalDateStr(new Date());

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

            const categories = aggregateCategoryCounts(dayEntries);
            const dateStr = toLocalDateStr(current);

            const dateLabel = current.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            const categoryNames = categories.map(c => c.title);
            const entryWord = dayEntries.length === 1 ? t('entry') : t('entries');
            const ariaLabel = dayEntries.length > 0
                ? `${dateLabel}, ${dayEntries.length} ${entryWord}: ${categoryNames.join(', ')}`
                : dateLabel;

            cells.push({
                day,
                dateStr,
                isToday: dateStr === todayStr,
                entryCount: dayEntries.length,
                ariaLabel,
                categories,
            });
        }

        return cells;
    });

    const todayEl = ref<HTMLElement | null>(null);
    const monthGoalsEl = ref<ComponentPublicInstance | null>(null)

    onMounted(async () => {
        await nextTick();
        todayEl.value?.scrollIntoView({ inline: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
        requestAnimationFrame(() => {
            monthGoalsEl.value?.$el?.classList?.add('mounted')
        })
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
        --day-width: 13ch;
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

    .month-goals-fade {
        opacity: 0;
        transform: translateY(1rem);
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);

        &.mounted {
            opacity: 1;
            transform: translateY(0);
        }
    }

    td.empty {
        pointer-events: none;
    }
</style>
