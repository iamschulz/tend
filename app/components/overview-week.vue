<template>
    <div data-carousel :aria-label="weekLabel">

        <TransitionGroup v-for="(day, name) in week" :key="name" ref="days" tag="ul" name="list" data-group="vertical" class="weekday nolist" :aria-label="String(name)">
            <li key="label" class="table-header">
                <span class="label" :class="{ active: name === todayName }" :aria-current="name === todayName ? 'date' : undefined">{{ name }}</span>
            </li>
            <li v-for="entry in day" :key="entry.id">
                <WeekEntry :entry="entry" />
            </li>
            <li v-if="!day.length" key="empty" class="empty" :aria-label="t('noEntries')">
                <nuxt-icon name="tend" />
            </li>
        </TransitionGroup>
    </div>

    <DayGoals ref="weekGoalsEl" :date="props.date" interval="week" class="week-goals-fade" />
</template>

<script setup lang="ts">
    import type { EntryWithCategory } from '~/types/EntryWithCategory';
    import { getDayRange } from '~/util/getDayRange';
    import { getWeekRange } from '~/util/getWeekRange';
    import { getWeekdays } from '~/contants/weekdays';
    import { prefersReducedMotion } from '~/util/prefersReducedMotion';

    const { t } = useI18n();

    const props = defineProps<{
        date: Date,
    }>();

    const data = useDataStore();

    const weekdays = getWeekdays(t);
    const weekLabel = t('weekOf', { date: props.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) });

    const weekRange = getWeekRange(props.date);
    const entries = computed(() => data.getEntriesForRange(weekRange[0], weekRange[1]));

    type Week = {
        [key: string]: EntryWithCategory[]
    }

    /** @param date - The date to get the localized weekday name for */
    const getWeekDayName = (date: Date): string => weekdays[(date.getDay() + 6) % 7]!.full;
    const today = new Date();
    const isCurrentWeek = today >= weekRange[0] && today <= weekRange[1];
    const todayName = isCurrentWeek ? getWeekDayName(today) : null;

    // Pre-bucket entries by day-of-week in one pass
    const week = computed<Week>(() => {
        // Build day start dates for each weekday
        const dayStarts: { name: string; start: string }[] = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(props.date);
            dayDate.setDate(dayDate.getDate() + i);
            dayStarts.push({
                name: getWeekDayName(dayDate),
                start: getDayRange(dayDate)[0].toString(),
            });
        }

        // Initialize buckets
        const result: Week = {};
        for (const d of dayStarts) {
            result[d.name] = [];
        }

        // Single pass over entries
        for (const entry of entries.value) {
            const entryDayStr = getDayRange(new Date(entry.start))[0].toString();
            for (const d of dayStarts) {
                if (d.start === entryDayStr) {
                    result[d.name]!.unshift(entry);
                    break;
                }
            }
        }

        return result;
    });

    // scroll to current day
    const days = ref<{ $el: HTMLElement }[] | null>(null);
    const weekGoalsEl = ref<ComponentPublicInstance | null>(null)

    onMounted(async () => {
        if (isCurrentWeek) {
            await nextTick();
            const dayNumber = (new Date().getDay() + 6) % 7;
            const currentDayEl = days.value![dayNumber]?.$el as HTMLElement | undefined;
            currentDayEl?.scrollIntoView({ inline: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth'});
        }
        requestAnimationFrame(() => {
            weekGoalsEl.value?.$el?.classList?.add('mounted')
        })
    })

</script>

<style scoped>
    .table-header {
        min-width: 9rem;
        font-weight: 700;
        text-align: center;
        margin-bottom: 1rem;

        .label {
            padding: 0.2ch 0.4rem;
            border-radius: var(--border-radius);

            &.active {
                background: var(--col-fg);
                color: var(--col-bg);
            }
        }
    }

    [data-group].weekday {
        position: relative;
        gap: 0.6rem;
        min-height: -webkit-fill-available; /* safari will not h-scroll entire container when days are empty or short */

        *:nth-of-type(2) {
            --br-tl: var(--border-radius);
            --br-tr: var(--border-radius);
        }
    }

    .empty {
        color: var(--col-bg3);
        text-align: center;
        border: 3px dashed var(--col-bg3);
        border-radius: var(--border-radius);

        .nuxt-icon {
            font-size: 1.5rem;
        }
    }

    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
        transition-timing-function: var(--animation-bounce);
        
    }

    .week-goals-fade {
        opacity: 0;
        transform: translateY(1rem);
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);

        &.mounted {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .list-enter-from {
        opacity: 0;
        z-index: 2;
        transform: translateY(-2.5rem);
    }
    .list-leave-to {
        opacity: 0;
        scale: 0.9;
        z-index: 0;
        transform: translateY(0);
    }
    .list-leave-active {
        position: absolute;
        transform: translateY(100%);
    }
</style>
