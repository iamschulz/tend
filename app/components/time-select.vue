<template>
    <section class="selectMenu">
        <NuxtLink href="/">{{ $t('today') }}</NuxtLink>
        <div data-group>
            <button class="shift" @click="shiftDate(-1, 'month')">&laquo;</button>
            <button class="shift" @click="shiftDate(-1, 'day')">&lsaquo;</button>
            <input type="date" v-model="dateValue">
            <button class="shift" @click="shiftDate(1, 'day')" :disabled="!canGoForwardDay">&rsaquo;</button>
            <button class="shift" @click="shiftDate(1, 'month')" :disabled="!canGoForwardMonth">&raquo;</button>
        </div>
        <div data-group>
            <button @click="onSelect('day')">{{ $t('day') }}</button>
            <button @click="onSelect('week')">{{ $t('week') }}</button>
            <button @click="onSelect('month')">{{ $t('month') }}</button>
            <button @click="onSelect('year')">{{ $t('year') }}</button>
        </div>
    </section>
</template>

<script lang="ts" setup>
    import { getIsoWeekString } from '~/util/getIsoWeekString'

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateValue = ref<string>(today);

    const toIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const shiftDate = (amount: number, unit: 'day' | 'month') => {
        const d = new Date(dateValue.value + 'T00:00:00');
        if (unit === 'day') d.setDate(d.getDate() + amount);
        else d.setMonth(d.getMonth() + amount);
        const shifted = toIso(d);
        dateValue.value = shifted > today ? today : shifted;
    }

    const canGoForwardDay = computed(() => dateValue.value < today);
    const canGoForwardMonth = computed(() => {
        const d = new Date(dateValue.value + 'T00:00:00');
        d.setMonth(d.getMonth() + 1);
        return toIso(d) <= today;
    });

    const onSelect = (period: 'day' | 'week' | 'month' | 'year') => {
        const value = dateValue.value;
        if (!value) return;

        const date = new Date(value + 'T00:00:00');

        switch (period) {
            case 'day':
                return navigateTo(value === today ? '/' : `/day/${value}`);
            case 'week':
                return navigateTo(`/week/${getIsoWeekString(date)}`);
            case 'month':
                return navigateTo(`/month/${value.slice(0, 7)}`);
            case 'year':
                return navigateTo(`/year/${value.slice(0, 4)}`);
        }
    }
</script>

<style scoped>
    .selectMenu {
        container-name: time-select;
        container-type: inline-size;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        margin-block-start: 0;
    }

    a {
        display: grid;
        place-items: center;
        background-image: none;
        background-color: var(--col-accent);
        padding: 0.25rem 1ch;
        border-radius: var(--br-tl, var(--border-radius)) var(--br-tr, var(--border-radius)) var(--br-br, var(--border-radius)) var(--br-bl, var(--border-radius));
        color: var(--col-accent-contrast);
        font-weight: 500;
        text-decoration: none;
        margin-block: 0.5rem;

        &:hover {
            background-color: var(--col-accent2);
        }
    }

    input[type="date"] {
        flex: 1 0 auto;
        min-width: 0;
        box-sizing: border-box;
    }

    [data-group] + [data-group] {
        margin-block-start: 0.5rem;
    }

    button {
        flex: 1;
    }

    @container time-select (width < 19rem) {
        .shift {
            display: none;
        }

        [data-group] {
            display: flex;
            flex-direction: column;

            > * {
                --br-tl: 0;
                --br-tr: 0;
                --br-bl: 0;
                --br-br: 0;
            }

            :first-child {
                --br-tl: var(--border-radius);
                --br-tr: var(--border-radius);
            }

            :last-child {
                --br-bl: var(--border-radius);
                --br-br: var(--border-radius);
            }
        }
    }
</style>
