<template>
    <div>
        <ul v-if="goals.length" class="nolist goals-list">
            <li v-for="(goal, i) in goals" :key="i" data-card data-shadow="1" class="goal-item">
                <span>{{ goal.count }}x / {{ $t(`per${goal.interval.charAt(0).toUpperCase()}${goal.interval.slice(1)}`) }}</span>
                <span class="goal-days">
                    <span v-for="(key, di) in weekdayKeys" :key="key" :class="{ active: goal.days & (1 << di) }">{{ $t(key) }}</span>
                </span>
                <button class="delete-goal" @click="removeGoal(i)">
                    <nuxt-icon name="delete" />
                </button>
            </li>
        </ul>

        <form class="goal-form" data-group @submit.prevent="onAddGoal">
            <input
                v-model.number="newGoal.count"
                type="number"
                min="1"
                :aria-label="$t('goalCount')"
                :placeholder="$t('goalCount')"
                required
            >
            <select v-model="newGoal.interval" :aria-label="$t('goalInterval')">
                <option value="day">{{ $t('perDay') }}</option>
                <option value="week">{{ $t('perWeek') }}</option>
                <option value="month">{{ $t('perMonth') }}</option>
            </select>
            <fieldset class="day-checkboxes">
                <label v-for="(key, di) in weekdayKeys" :key="key">
                    <input type="checkbox" :checked="!!(newGoal.days & (1 << di))" @change="toggleDay(di)">
                    <span>{{ $t(key) }}</span>
                </label>
            </fieldset>
            <label class="reminder-label">
                <input v-model="newGoal.reminder" type="checkbox">
                {{ $t('goalReminder') }}
            </label>
            <button type="submit">
                <nuxt-icon name="add" />
                <span class="sr-only">{{ $t('addGoal') }}</span>
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
    import type { Goal } from '~/types/Goal';
    import { useDataStore } from '~/stores/data';

    const props = defineProps<{
        categoryId: string
        goals: Goal[]
    }>()

    const data = useDataStore()

    const weekdayKeys = ['weekdayMoShort', 'weekdayTuShort', 'weekdayWeShort', 'weekdayThShort', 'weekdayFrShort', 'weekdaySaShort', 'weekdaySuShort'] as const

    const createEmptyGoal = (): Goal => ({
        count: 1,
        interval: 'week',
        days: 127,
        reminder: false,
    })

    const newGoal = ref<Goal>(createEmptyGoal())

    const toggleDay = (dayIndex: number) => {
        newGoal.value.days ^= (1 << dayIndex)
    }

    const onAddGoal = () => {
        const goals = [...props.goals, { ...newGoal.value }]
        data.updateCategory({ id: props.categoryId, goals })
        newGoal.value = createEmptyGoal()
    }

    const removeGoal = (index: number) => {
        const goals = props.goals.filter((_, i) => i !== index)
        data.updateCategory({ id: props.categoryId, goals })
    }
</script>

<style scoped>
    .goals-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .goal-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 0.75rem;
    }

    .goal-days {
        display: flex;
        gap: 0.25rem;
        font-size: 0.75rem;

        span {
            color: var(--col-fg3);
        }

        .active {
            color: var(--col-fg);
            font-weight: 700;
        }
    }

    .delete-goal {
        margin-left: auto;
    }

    .goal-form {
        input[type="number"] {
            max-width: 8ch;
        }

        select {
            max-width: 14ch;
        }
    }

    .day-checkboxes {
        display: flex;
        gap: 0.25rem;
        border: none;
        padding: 0;
        margin: 0;

        label {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 0.75rem;
            cursor: pointer;
        }
    }

    .reminder-label {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        padding: 0 0.5rem;
    }
</style>
