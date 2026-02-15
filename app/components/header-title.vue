<template>
    <h1 class="title">
        <NuxtLink v-if="title.prevLink" :to="title.prevLink" class="nav-link">
            <nuxt-icon name="arrow_left" size="48" />
            <span class="sr-only">{{ $t('previous') }}</span>
        </NuxtLink>

        <span class="long">{{ title.long }}</span>
        <span class="short">{{ title.short }}</span>

        <NuxtLink v-if="title.nextLink" :to="title.nextLink" class="nav-link">
            <nuxt-icon name="arrow_right" size="48" />
            <span class="sr-only">{{ $t('next') }}</span>
        </NuxtLink>
    </h1>
</template>

<script setup lang="ts">
    import { titleForDay } from '~/util/titleForDay'
    import { titleForWeek } from '~/util/titleForWeek'
    import { titleForMonth } from '~/util/titleForMonth'
    import { titleForYear } from '~/util/titleForYear'
    import type { TitleInfo } from '~/util/titleForDay'
    const { t } = useI18n()

    const route = useRoute();

    const fallback: TitleInfo = { short: 'Tend', long: 'Tend', prevLink: null, nextLink: null };

    const title = computed<TitleInfo>(() => {
        const path = route.path;
        const param = route.params.date;
        const dateStr = typeof param === 'string' ? param : null;

        // / → today
        if (path === '/') return titleForDay(new Date(), t);

        // /day/YYYY-MM-DD
        if (path.startsWith('/day/') && dateStr) {
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) return fallback;
            return titleForDay(date, t);
        }

        // /week/YYYY-Www
        if (path.startsWith('/week/') && dateStr) {
            return titleForWeek(dateStr, t) ?? fallback;
        }

        // /month/YYYY-MM
        if (path.startsWith('/month/') && dateStr) {
            return titleForMonth(dateStr) ?? fallback;
        }

        // /year/YYYY
        if (path.startsWith('/year/') && dateStr) {
            return titleForYear(dateStr) ?? fallback;
        }

        return fallback;
    });
</script>

<style scoped>
    .title {
        margin: 0;
        font-size: 2rem;
        display: flex;
        align-items: center;
        gap: 0.5ch;
    }

    .nav-link {
        font-size: 0.75em;
        text-decoration: none;
        color: inherit;
        margin-bottom: -0.375rem;
    }

    .short {
        display: inline;
    }

    .long {
        display: none;
    }

    @media (min-width: 38rem) {
        .short {
            display: none;
        }

        .long {
            display: inline;
        }
    }
</style>
