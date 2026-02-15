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
    import { getDayRange } from '~/util/getDayRange';
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
        categories: { id: string; title: string; color: string }[];
    };

    const todayStr = new Date().toISOString().slice(0, 10);

    const calendarCells = computed<(DayCell | null)[]>(() => {
        const year = props.date.getUTCFullYear();
        const month = props.date.getUTCMonth();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

        // Monday = 0, Sunday = 6
        const firstDayOfWeek = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

        const cells: (DayCell | null)[] = Array(firstDayOfWeek).fill(null);

        for (let day = 1; day <= daysInMonth; day++) {
            const current = new Date(Date.UTC(year, month, day));
            const [dayStart, dayEnd] = getDayRange(current);

            const dayEntries = entries.value.filter(entry => {
                const start = new Date(entry.start);
                return start >= dayStart && start <= dayEnd;
            });

            const seen = new Map<string, { id: string; title: string; color: string }>();
            for (const entry of dayEntries) {
                if (entry.category && !seen.has(entry.category.id)) {
                    seen.set(entry.category.id, {
                        id: entry.category.id,
                        title: entry.category.title,
                        color: entry.category.color,
                    });
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
                isToday: current.toISOString().slice(0, 10) === todayStr,
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
        --day-width: 7ch;
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
