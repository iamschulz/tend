<template>
    <div data-carousel>
        <ul v-for="(day, name) in week" :key="name" ref="days" data-group="vertical" class="weekday nolist">
            <li class="table-header">
                <span class="label" :class="{ active: name === getWeekDay(new Date()) }">{{ name }}</span>
            </li>
            <li v-for="entry in day" :key="entry.id">
                <WeekEntry :entry="entry" />
            </li>
            <li v-if="!day.length" class="empty">Nothing today</li>
        </ul>
    </div>
</template>

<script setup lang="ts">
    import type { EntryWithCategory } from '~/types/Category';
    import { getDayRange } from '~/util/getDayRange';
    import { getWeekRange } from '~/util/getWeekRange';

    const props = defineProps<{
        date: Date,
    }>();

    const data = useDataStore();

    const weekRange = getWeekRange(props.date);
    const entries = computed(() => data.getEntriesForRange(weekRange[0], weekRange[1]));

    type Week = {
        [key: string]: EntryWithCategory[]
    }
    
    const getWeekDay = (date: Date): string => new Date(date).toLocaleDateString([], { weekday: 'long' });
    const populateWeek = (entries: EntryWithCategory[]): Week => {
        const week: Week = {}
        for (let i=0; i < 7; i++) {
            const currentDayRange = getDayRange(new Date(props.date));
            currentDayRange[0].setDate(currentDayRange[0].getDate() + i);
            currentDayRange[1].setDate(currentDayRange[1].getDate() + i);
            const nextWeekday = getWeekDay(currentDayRange[0]);
            const dayEntries = entries.filter(
                entry => getDayRange(new Date(entry.start))[0].toString() === currentDayRange[0].toString()
            ).reverse();
            week[nextWeekday] = dayEntries;
        }
        return week;
    }

    const week = ref(populateWeek(entries.value));
    watch(entries, (updatedEntries: EntryWithCategory[]) => {
        week.value = populateWeek(updatedEntries);
    }, { deep: true })

    // scroll to current day
    const days = ref<HTMLElement[] | null>(null);
    
    onMounted(async () => {
        await nextTick();
        const dayNumber = (new Date().getDay() + 6) % 7;
        const currentDayEl = days.value![dayNumber];
        currentDayEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth'});
    })

    // todo: add date above table
    // todo: add some statistics below table
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
        *:nth-of-type(2) {
            --br-tl: var(--border-radius);
            --br-tr: var(--border-radius);
        }
    }

    .empty {
        color: var(--col-fg2);
        text-align: center;
    }
</style>