<template>
    <section class="selectMenu">
            <h3>{{ $t('selectDay') }}</h3>
            <form data-group @submit.prevent="onDaySelect">
                <NuxtLink href="/">{{ $t('today') }}</NuxtLink>
                <NuxtLink :href="`/day/${yesterday}`">{{ $t('yesterday') }}</NuxtLink>
                <input ref="daySelectEl" type="date" :value="new Date().toISOString().split('T')[0]">
                <button type="submit">{{ $t('go') }}</button>
            </form>
            <div data-group>
                <NuxtLink :href="`/week/${currentWeek}`">{{ $t('week') }}</NuxtLink>
                <NuxtLink :href="`/month/${currentMonth}`">{{ $t('month') }}</NuxtLink>
                <NuxtLink :href="`/year/${currentYear}`">{{ $t('year') }}</NuxtLink>
            </div>
        </section>
</template>

<script lang="ts" setup>
    import { getIsoWeekString } from '~/util/getIsoWeekString'

    const d = new Date(); d.setUTCDate(d.getUTCDate() - 1);
    const yesterday = d.toISOString().slice(0, 10);
    const currentWeek = getIsoWeekString(new Date());
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = String(new Date().getUTCFullYear());




    const daySelectEl = useTemplateRef('daySelectEl');
    const onDaySelect = () => {
        navigateTo(`/day/${daySelectEl.value?.value}`)
    }
</script>

<style scoped>
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
    }
</style>
