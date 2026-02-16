<template>
    <section class="selectMenu">
        <div data-group>
            <NuxtLink href="/">{{ $t('today') }}</NuxtLink>
            <NuxtLink :href="`/week/${currentWeek}`">{{ $t('week') }}</NuxtLink>
            <NuxtLink :href="`/month/${currentMonth}`">{{ $t('month') }}</NuxtLink>
            <NuxtLink :href="`/year/${currentYear}`">{{ $t('year') }}</NuxtLink>
        </div>
        <form data-group @submit.prevent="onDaySelect">
            <input ref="daySelectEl" type="date" :value="new Date().toISOString().split('T')[0]">
            <button type="submit">{{ $t('go') }}</button>
        </form>
    </section>
</template>

<script lang="ts" setup>
    import { getIsoWeekString } from '~/util/getIsoWeekString'

    const d = new Date(); d.setUTCDate(d.getUTCDate() - 1);
    const currentWeek = getIsoWeekString(new Date());
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = String(new Date().getUTCFullYear());




    const daySelectEl = useTemplateRef('daySelectEl');
    const onDaySelect = () => {
        navigateTo(`/day/${daySelectEl.value?.value}`)
    }
</script>

<style scoped>
    .selectMenu {
        container-name: time-select;
        container-type: inline-size;
    }

    div {
        margin-block: 1rem;
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
    }

    button[type="submit"] {
        font-weight: 700;
    }

    @container time-select (width < 18rem) {
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
