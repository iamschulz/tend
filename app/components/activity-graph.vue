<template>
    <div>
        <div class="graph-scroll">
        <svg
            ref="gridEl"
            class="activity-graph"
            :viewBox="`0 0 ${cols * (cellSize + cellGap) + labelWidth} ${7 * (cellSize + cellGap) + monthLabelHeight}`"
            role="grid"
            :aria-label="$t('statisticsGraphLabel', { year })"
            @keydown="onGridKeydown"
        >
            <!-- Month labels -->
            <text
                v-for="label in monthLabels"
                :key="label.month"
                :x="label.x"
                :y="monthLabelHeight - 4"
                class="month-label"
                role="presentation"
                :aria-label="label.fullName"
            >{{ label.text }}</text>

            <!-- Rows: one per day of week -->
            <g v-for="(row, rowIdx) in gridRows" :key="rowIdx" role="row">
                <!-- Day-of-week label -->
                <text
                    :x="0"
                    :y="monthLabelHeight + (rowIdx + 1) * (cellSize + cellGap) - 5"
                    class="day-label"
                    role="presentation"
                    :aria-label="dayLabels[rowIdx]?.full"
                >{{ dayLabels[rowIdx]?.short }}</text>

                <!-- Day cells -->
                <template v-for="cell in row" :key="cell.date">
                    <NuxtLink
                        v-if="!cell.future"
                        :to="`/day/${cell.date}`"
                        role="gridcell"
                        :tabindex="cell.date === focusedDate ? 0 : -1"
                        :aria-label="cell.tooltip"
                        :data-date="cell.date"
                    >
                        <rect
                            :x="cell.x"
                            :y="cell.y"
                            :width="cellSize"
                            :height="cellSize"
                            rx="2"
                            :class="['cell', `level-${cell.level}`]"
                        />
                    </NuxtLink>
                    <rect
                        v-else
                        :x="cell.x"
                        :y="cell.y"
                        :width="cellSize"
                        :height="cellSize"
                        rx="2"
                        :class="['cell', `level-${cell.level}`]"
                        role="gridcell"
                        :aria-label="cell.tooltip"
                    />
                </template>
            </g>
        </svg>
        </div>

        <label v-if="goals.length > 0" class="mode-toggle">
            <span>{{ $t('entries').charAt(0).toUpperCase() + $t('entries').slice(1) }}</span>
            <input v-model="showGoals" type="checkbox" data-toggle>
            <span>{{ $t('goals') }}</span>
        </label>
    </div>
</template>

<script setup lang="ts">
    import type { Entry } from '~/types/Entry';
    import type { Goal } from '~/types/Goal';
    import { getGoalProgress } from '~/util/getGoalProgress';

    const { t, locale } = useI18n();

    const props = defineProps<{
        year: number;
        entries: Entry[];
        allEntries: Entry[];
        categoryId: string;
        goals: Goal[];
        color: string;
    }>();

    const showGoals = ref(false);
    const gridEl = ref<SVGSVGElement | null>(null);

    const cellSize = 12;
    const cellGap = 3;
    const labelWidth = 28;
    const monthLabelHeight = 16;

    const dayLabels = computed(() => [
        { short: t('weekdayMoShort'), full: t('weekdayMo') },
        { short: t('weekdayTuShort'), full: t('weekdayTu') },
        { short: t('weekdayWeShort'), full: t('weekdayWe') },
        { short: t('weekdayThShort'), full: t('weekdayTh') },
        { short: t('weekdayFrShort'), full: t('weekdayFr') },
        { short: t('weekdaySaShort'), full: t('weekdaySa') },
        { short: t('weekdaySuShort'), full: t('weekdaySu') },
    ]);

    // Build a count map: date string -> entry count
    const entryCountsByDate = computed(() => {
        const map = new Map<string, number>();
        for (const entry of props.entries) {
            const d = new Date(entry.start);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    });

    // Build a goal-completion map: date string -> number of goals completed
    const goalCountsByDate = computed(() => {
        const map = new Map<string, number>();
        if (props.goals.length === 0) return map;

        const d = new Date(props.year, 0, 1);
        const endDate = new Date(props.year, 11, 31);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        while (d <= endDate && d <= today) {
            const dayIndex = (d.getDay() + 6) % 7;
            let completed = 0;
            let applicable = 0;

            for (const goal of props.goals) {
                if (goal.interval === 'day' && !(goal.days & (1 << dayIndex))) continue;
                applicable++;
                const progress = getGoalProgress(goal, props.allEntries, props.categoryId, d.getTime(), d);
                if (progress >= goal.count) completed++;
            }

            if (applicable > 0) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                map.set(key, completed);
            }

            d.setDate(d.getDate() + 1);
        }
        return map;
    });

    const countsByDate = computed(() =>
        showGoals.value ? goalCountsByDate.value : entryCountsByDate.value
    );

    // Determine the start date (first day of the year, adjusted to the previous Monday)
    const yearStart = new Date(props.year, 0, 1);
    const startDay = yearStart.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = (startDay + 6) % 7;
    const gridStart = new Date(yearStart);
    gridStart.setDate(gridStart.getDate() - mondayOffset);

    const yearEnd = new Date(props.year, 11, 31);

    // Number of weeks (columns)
    const totalDays = Math.ceil((yearEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const cols = Math.ceil(totalDays / 7);

    const maxCount = computed(() => {
        const values = [...countsByDate.value.values()];
        if (values.length === 0) return 1;
        return Math.max(...values);
    });

    type Cell = {
        date: string;
        col: number;
        row: number;
        x: number;
        y: number;
        level: number;
        tooltip: string;
        future: boolean;
    };

    // Produce a 2D grid: gridRows[row][colIndex] = Cell
    const gridRows = computed<Cell[][]>(() => {
        const rows: Cell[][] = Array.from({ length: 7 }, () => []);
        const max = maxCount.value;
        const d = new Date(gridStart);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayTs = today.getTime();
        const isGoals = showGoals.value;
        const goalWord = t('goals').toLowerCase();

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < 7; row++) {
                const year = d.getFullYear();
                if (year === props.year) {
                    const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const count = countsByDate.value.get(key) ?? 0;

                    let level = 0;
                    if (count > 0) {
                        const ratio = count / max;
                        if (ratio <= 0.25) level = 1;
                        else if (ratio <= 0.5) level = 2;
                        else if (ratio <= 0.75) level = 3;
                        else level = 4;
                    }

                    const dateStr = d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' });
                    let tooltip: string;
                    if (isGoals) {
                        tooltip = count > 0
                            ? `${count} ${goalWord} – ${dateStr}`
                            : dateStr;
                    } else {
                        const entryWord = count === 1 ? t('entry') : t('entries');
                        tooltip = count > 0
                            ? `${count} ${entryWord} – ${dateStr}`
                            : dateStr;
                    }

                    rows[row]!.push({
                        date: key,
                        col,
                        row,
                        x: labelWidth + col * (cellSize + cellGap),
                        y: monthLabelHeight + row * (cellSize + cellGap),
                        level,
                        tooltip,
                        future: d.getTime() > todayTs,
                    });
                }
                d.setDate(d.getDate() + 1);
            }
        }
        return rows;
    });

    const { focusedKey: focusedDate, onGridKeydown } = useGridNavigation(
        gridEl,
        () => gridRows.value.flatMap(row => row.map(cell => ({ key: cell.date, row: cell.row, col: cell.col }))),
        `${props.year}-01-01`,
    );

    // Month labels positioned at the first week column of each month
    const monthLabels = computed(() => {
        const labels: { month: number; x: number; text: string; fullName: string }[] = [];
        const seen = new Set<number>();
        const d = new Date(gridStart);

        for (let col = 0; col < cols; col++) {
            if (d.getFullYear() === props.year && !seen.has(d.getMonth())) {
                seen.add(d.getMonth());
                labels.push({
                    month: d.getMonth(),
                    x: labelWidth + col * (cellSize + cellGap),
                    text: d.toLocaleDateString(locale.value, { month: 'short' }),
                    fullName: d.toLocaleDateString(locale.value, { month: 'long' }),
                });
            }
            d.setDate(d.getDate() + 7);
        }
        return labels;
    });
</script>

<style scoped>
    .graph-scroll {
        overflow-x: auto;
    }

    .activity-graph {
        min-width: 800px;
        width: 100%;
        height: auto;
    }

    .month-label,
    .day-label {
        font-size: 9px;
        fill: var(--col-fg3);
    }

    .cell {
        fill: var(--col-bg3);

        &.level-1 { fill: color-mix(in oklch, v-bind(color) 25%, var(--col-bg3)); }
        &.level-2 { fill: color-mix(in oklch, v-bind(color) 50%, var(--col-bg3)); }
        &.level-3 { fill: color-mix(in oklch, v-bind(color) 75%, var(--col-bg3)); }
        &.level-4 { fill: v-bind(color); }
    }

    [role="gridcell"]:focus {
        outline: 2px solid var(--col-fg);
        outline-offset: 1px;
    }

    .mode-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
</style>
