<template>
    <div>
        <svg
            class="activity-graph"
            :viewBox="`0 0 ${cols * (cellSize + cellGap) + labelWidth} ${7 * (cellSize + cellGap) + monthLabelHeight}`"
            role="img"
            :aria-label="$t('statisticsGraphLabel', { year })"
        >
            <!-- Month labels -->
            <text
                v-for="label in monthLabels"
                :key="label.month"
                :x="label.x"
                :y="monthLabelHeight - 4"
                class="month-label"
            >{{ label.text }}</text>

            <!-- Day labels -->
            <text :x="0" :y="monthLabelHeight + 1 * (cellSize + cellGap) - 2" class="day-label">{{ $t('weekdayMoShort') }}</text>
            <text :x="0" :y="monthLabelHeight + 3 * (cellSize + cellGap) - 2" class="day-label">{{ $t('weekdayWeShort') }}</text>
            <text :x="0" :y="monthLabelHeight + 5 * (cellSize + cellGap) - 2" class="day-label">{{ $t('weekdayFrShort') }}</text>

            <!-- Cells -->
            <rect
                v-for="cell in cells"
                :key="cell.date"
                :x="cell.x"
                :y="cell.y"
                :width="cellSize"
                :height="cellSize"
                rx="2"
                :class="['cell', `level-${cell.level}`]"
            >
                <title>{{ cell.tooltip }}</title>
            </rect>
        </svg>

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

    const { t } = useI18n();

    const props = defineProps<{
        year: number;
        entries: Entry[];
        allEntries: Entry[];
        categoryId: string;
        goals: Goal[];
        color: string;
    }>();

    const showGoals = ref(false);

    const cellSize = 12;
    const cellGap = 3;
    const labelWidth = 28;
    const monthLabelHeight = 16;

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
    // Shift so Monday=0
    const mondayOffset = (startDay + 6) % 7;
    const gridStart = new Date(yearStart);
    gridStart.setDate(gridStart.getDate() - mondayOffset);

    const yearEnd = new Date(props.year, 11, 31);

    // Number of weeks (columns)
    const totalDays = Math.ceil((yearEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const cols = Math.ceil(totalDays / 7);

    // Quantile thresholds for levels
    const maxCount = computed(() => {
        const values = [...countsByDate.value.values()];
        if (values.length === 0) return 1;
        return Math.max(...values);
    });

    type Cell = {
        date: string;
        x: number;
        y: number;
        level: number;
        tooltip: string;
    };

    const cells = computed<Cell[]>(() => {
        const result: Cell[] = [];
        const max = maxCount.value;
        const d = new Date(gridStart);
        const isGoals = showGoals.value;
        const goalWord = t('goals').toLowerCase();

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < 7; row++) {
                const year = d.getFullYear();
                // Only render cells within the target year
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

                    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

                    result.push({
                        date: key,
                        x: labelWidth + col * (cellSize + cellGap),
                        y: monthLabelHeight + row * (cellSize + cellGap),
                        level,
                        tooltip,
                    });
                }
                d.setDate(d.getDate() + 1);
            }
        }
        return result;
    });

    // Month labels positioned at the first week column of each month
    const monthLabels = computed(() => {
        const labels: { month: number; x: number; text: string }[] = [];
        const seen = new Set<number>();
        const d = new Date(gridStart);

        for (let col = 0; col < cols; col++) {
            // Check the Monday of this column
            if (d.getFullYear() === props.year && !seen.has(d.getMonth())) {
                seen.add(d.getMonth());
                labels.push({
                    month: d.getMonth(),
                    x: labelWidth + col * (cellSize + cellGap),
                    text: d.toLocaleDateString(undefined, { month: 'short' }),
                });
            }
            d.setDate(d.getDate() + 7);
        }
        return labels;
    });
</script>

<style scoped>
    .activity-graph {
        width: 100%;
        max-width: 900px;
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

    .mode-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
</style>
