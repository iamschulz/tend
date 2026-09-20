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
            @mouseleave="hoveredPeriod = null"
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
                        @mouseenter="hoveredPeriod = cell.periodId"
                        @focus="hoveredPeriod = cell.periodId"
                        @blur="hoveredPeriod = null"
                    >
                        <rect
                            :x="cell.x"
                            :y="cell.y"
                            :width="cellSize"
                            :height="cellSize"
                            :rx="cellRadius"
                            :class="['cell', `level-${cell.level}`]"
                        />
                    </NuxtLink>
                    <rect
                        v-else
                        :x="cell.x"
                        :y="cell.y"
                        :width="cellSize"
                        :height="cellSize"
                        :rx="cellRadius"
                        :class="['cell', `level-${cell.level}`]"
                        role="gridcell"
                        :aria-label="cell.tooltip"
                        @mouseenter="hoveredPeriod = null"
                    />
                </template>
            </g>

            <!-- Streaks: one continuous outline per week column each of them spans -->
            <rect
                v-for="outline in runOutlines"
                :key="outline.key"
                :x="outline.x"
                :y="outline.y"
                :width="outline.width"
                :height="outline.height"
                :rx="cellRadius + outlineOffset"
                class="run-outline"
                role="presentation"
            />

            <!-- Emphasis: the hovered goal period, drawn over the outline it sits in -->
            <rect
                v-for="outline in activeOutlines"
                :key="outline.key"
                :x="outline.x"
                :y="outline.y"
                :width="outline.width"
                :height="outline.height"
                :rx="cellRadius + outlineOffset"
                class="run-outline run-active"
                role="presentation"
            />

            <text
                v-for="marker in streakMarkers"
                :key="marker.key"
                :x="marker.x"
                :y="marker.y"
                :font-size="streakIconSize"
                text-anchor="middle"
                dominant-baseline="central"
                class="streak-icon"
                role="presentation"
            >{{ streakEmoji }}</text>
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
    import { getGoalProgress, getGoalPeriodKey } from '~/util/getGoalProgress';
    import { countEntriesByDate, dateKey } from '~/util/countEntriesByDate';
    import { streakEmoji } from '~/util/streakIcon';

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

    /**
     * Goal period currently hovered or focused, as `<streak>-<period>`. Null when the
     * pointer is on no streak day.
     *
     * The emphasis follows the unit the goal is measured in, not the week column the
     * outline happens to be drawn in: pointing at a day of a monthly streak lights up that
     * whole month, at a weekly streak its week, and at a daily one just that day.
     *
     * Only a cell sets this, and only the grid as a whole clears it. Clearing it per cell
     * instead would flicker: the cells are three pixels apart, and crossing that gap would
     * drop the emphasis and bring it straight back. Sweeping along a streak therefore keeps
     * it lit, and it goes out on the first cell that is part of something else.
     *
     * This deliberately stays in JS. The same effect is expressible in pure CSS with one
     * :has() rule per streak id, but measured on a dense year (365 cells, 122 streaks) that
     * costs ~18 ms of style recalculation per hover move versus ~0.7 ms here — over a frame
     * budget, so the mouse visibly stutters across the graph.
     */
    const hoveredPeriod = ref<string | null>(null);

    const cellSize = 12;
    const cellGap = 3;
    const cellRadius = 2;
    const streakIconSize = 10; // fits inside a cell with a hair of padding
    const outlineOffset = 1.5; // half the gap, so the outline sits between the cells
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

    // date -> how many entries touch that day, counting one that runs past midnight on
    // both of them.
    const entryCountsByDate = computed(() => countEntriesByDate(props.entries));

    /**
     * The finest period any of this category's goals is measured in — the unit a streak
     * advances by. With a daily goal a streak grows by the day, with a weekly one by the
     * week, and a category mixing both is only as slow as its fastest goal.
     */
    const streakInterval = computed<Goal['interval']>(() => {
        const rank = { day: 0, week: 1, month: 2 };
        let finest: Goal['interval'] = 'month';
        for (const goal of props.goals) {
            if (rank[goal.interval] < rank[finest]) finest = goal.interval;
        }
        return finest;
    });

    // Walk the year day by day, recording how many goals were completed and whether
    // every applicable goal was met — the latter is what streaks are built from.
    const goalDays = computed(() => {
        const days: { key: string; period: string; applicable: number; completed: number; met: boolean }[] = [];
        if (props.goals.length === 0) return days;

        // Streaks only count completed goals, so a still-running timer contributes nothing.
        const settledEntries = props.allEntries.filter(e => !e.running && e.end !== null);
        const hasRunning = settledEntries.length !== props.allEntries.length;

        const d = new Date(props.year, 0, 1);
        const endDate = new Date(props.year, 11, 31);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        while (d <= endDate && d <= today) {
            const dayIndex = (d.getDay() + 6) % 7;
            let completed = 0;
            let applicable = 0;
            let met = true;

            for (const goal of props.goals) {
                if (goal.interval === 'day' && !(goal.days & (1 << dayIndex))) continue;
                applicable++;
                const progress = getGoalProgress(goal, props.allEntries, props.categoryId, d.getTime(), d);
                if (progress >= goal.count) completed++;
                const settled = hasRunning
                    ? getGoalProgress(goal, settledEntries, props.categoryId, d.getTime(), d)
                    : progress;
                if (settled < goal.count) met = false;
            }

            days.push({
                key: dateKey(d),
                period: getGoalPeriodKey(streakInterval.value, d),
                applicable,
                completed,
                met: met && applicable > 0,
            });
            d.setDate(d.getDate() + 1);
        }
        return days;
    });

    /**
     * date -> number of goals completed, but only for days something was actually logged
     * on.
     *
     * A weekly or monthly goal is met by the *period*, so every day of a met week reports
     * it as completed — colouring the whole week would credit days the user did nothing
     * on. The streak itself still covers those days, and the hover outline is what shows
     * that; the cell colour stays a record of days with an entry.
     */
    const goalCountsByDate = computed(() => {
        const map = new Map<string, number>();
        for (const day of goalDays.value) {
            if (day.applicable > 0 && entryCountsByDate.value.has(day.key)) {
                map.set(day.key, day.completed);
            }
        }
        return map;
    });

    /**
     * Consecutive stretches of days where every applicable goal was met. Days with no
     * applicable goal neither extend nor break a run, mirroring getGoalStreak.
     *
     * A run has to cover more than one goal period to count, because that is what a streak
     * is: the goal met again in the period after. A weekly goal met once marks all seven
     * days of its week, but that is a single period and no more a streak than a single met
     * day is for a daily goal — which is also what the streak count next to the goal says.
     */
    const streakRuns = computed(() => {
        const runs: { key: string; period: string }[][] = [];
        let run: { key: string; period: string }[] = [];

        for (const day of goalDays.value) {
            if (day.applicable === 0) continue;
            if (day.met) {
                run.push({ key: day.key, period: day.period });
            } else {
                if (run.length > 0) runs.push(run);
                run = [];
            }
        }
        if (run.length > 0) runs.push(run);

        return runs.filter(r => new Set(r.map(d => d.period)).size > 1);
    });

    /**
     * date -> the streak it belongs to: the run's full length, which run it is, and the
     * goal period the day falls in. `length` is the whole run, because that is what the
     * cell label reports.
     */
    const streakByDate = computed(() => {
        const map = new Map<string, { length: number; run: number; period: string }>();
        streakRuns.value.forEach((run, index) => {
            run.forEach(({ key, period }) => {
                map.set(key, { length: run.length, run: index, period });
            });
        });
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
        run: number; // streak index
        periodId: string | null; // streak and goal period the day belongs to, null when in none
        streakLength: number; // days in that streak, 0 when the day is in none
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
                    const key = dateKey(d);
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
                    const streak = isGoals ? streakByDate.value.get(key) : undefined;
                    let tooltip: string;
                    if (isGoals) {
                        const base = count > 0 ? `${count} ${goalWord} – ${dateStr}` : dateStr;
                        // No icon here: this string is only ever an aria-label, so the
                        // sprout on the cell is what sighted users get, and a screen
                        // reader would just read a decorative emoji out loud.
                        tooltip = streak ? `${base} · ${t('streakDays', { count: streak.length })}` : base;
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
                        run: streak?.run ?? -1,
                        periodId: streak ? `${streak.run}-${streak.period}` : null,
                        streakLength: streak?.length ?? 0,
                    });
                }
                d.setDate(d.getDate() + 1);
            }
        }
        return rows;
    });

    /**
     * One sprout per streak day that was actually worked on. Days a streak only passes
     * over — the rest of a week a weekly goal was met in — carry no sprout, for the same
     * reason they carry no colour; the hover outline is what shows they belong to the run.
     */
    const streakMarkers = computed(() =>
        gridRows.value.flat()
            .filter(cell => cell.run >= 0 && entryCountsByDate.value.has(cell.date))
            .map(cell => ({
                key: cell.date,
                x: cell.x + cellSize / 2,
                y: cell.y + cellSize / 2,
            }))
    );

    /**
     * Frames the given cells: one rounded box per week column, spanning the first to the
     * last of them in that column.
     *
     * Boxes break at the week boundary instead of being connected across the grid: the
     * jump from a Sunday to the Monday after it is a whole column wide, and a connector
     * drawn across that distance reads as noise rather than as one stretch of time.
     *
     * A box encloses everything between its first and last cell, including days the goal
     * does not apply to — the Tuesday of a Mon/Wed/Fri goal sits inside the frame. That is
     * the point: those days never broke the run, so the streak really is one stretch of
     * time. A day that broke the run cannot end up enclosed, because it ends the run.
     *
     * @param cells - Cells to frame
     * @param groupOf - Groups cells into boxes; cells sharing a group are framed together
     */
    function frameCells(cells: Cell[], groupOf: (cell: Cell) => string) {
        const spans = new Map<string, { x: number; top: number; bottom: number }>();

        for (const cell of cells) {
            const id = groupOf(cell);
            const span = spans.get(id);
            if (span) {
                span.top = Math.min(span.top, cell.y);
                span.bottom = Math.max(span.bottom, cell.y + cellSize);
            } else {
                spans.set(id, { x: cell.x, top: cell.y, bottom: cell.y + cellSize });
            }
        }

        return [...spans].map(([id, span]) => ({
            key: id,
            x: span.x - outlineOffset,
            y: span.top - outlineOffset,
            width: cellSize + outlineOffset * 2,
            height: span.bottom - span.top + outlineOffset * 2,
        }));
    }

    /**
     * Every streak, framed continuously per week column. Drawn at all times, so the graph
     * shows its streaks at a glance whether or not anything is hovered.
     */
    const runOutlines = computed(() =>
        frameCells(
            gridRows.value.flat().filter(cell => cell.run >= 0),
            cell => `${cell.run}-${cell.col}`,
        ),
    );

    /**
     * The hovered goal period, framed the same way and drawn over the outline it sits in.
     *
     * This is a second set of shapes rather than a state on the first, because the unit the
     * emphasis follows and the unit the outline is drawn in are not the same: a month is
     * several week columns, and a day is a fraction of one.
     */
    const activeOutlines = computed(() => {
        if (hoveredPeriod.value === null) return [];

        return frameCells(
            gridRows.value.flat().filter(cell => cell.periodId === hoveredPeriod.value),
            cell => `active-${cell.col}`,
        );
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

    .streak-icon {
        /* The glyph covers the centre of its cell, so it must not swallow the hover
           that lights up the streak the cell belongs to. */
        pointer-events: none;
        --categoryColor: v-bind(color);
        --streakShadowColor: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
        filter: drop-shadow(0px 0px 1px var(--streakShadowColor)) drop-shadow(0px 0px 2px var(--streakShadowColor));
    }

    .run-outline {
        /* Sits over the cells it frames, so it must not swallow their hover. */
        pointer-events: none;
        fill: none;
        /* The category colour, pulled halfway to the foreground so it stays legible
           against both the cells it frames and the empty ones around them. */
        stroke: color-mix(in oklch, v-bind(color) 50%, var(--col-fg));
        stroke-width: 1;
    }

    /* Hover only thickens what is already drawn — the outline never changes colour. */
    .run-outline.run-active {
        stroke-width: 2;
    }
</style>
