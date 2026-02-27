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
    const { t, locale } = useI18n()

    const route = useRoute();

    const fallback: TitleInfo = { short: 'Tend', long: 'Tend', prevLink: null, nextLink: null };

    const title = computed<TitleInfo>(() => {
        const path = route.path;
        const param = route.params.date;
        const dateStr = typeof param === 'string' ? param : null;

        // / → today
        if (path === '/') return titleForDay(new Date(), t, locale.value);

        // /day/YYYY-MM-DD
        if (path.startsWith('/day/') && dateStr) {
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) return fallback;
            return titleForDay(date, t, locale.value);
        }

        // /week/YYYY-Www
        if (path.startsWith('/week/') && dateStr) {
            return titleForWeek(dateStr, t, locale.value) ?? fallback;
        }

        // /month/YYYY-MM
        if (path.startsWith('/month/') && dateStr) {
            return titleForMonth(dateStr, locale.value) ?? fallback;
        }

        // /year/YYYY
        if (path.startsWith('/year/') && dateStr) {
            return titleForYear(dateStr) ?? fallback;
        }

        return fallback;
    });

    useHead({
        title: computed(() => `${title.value.long} |`)
    });
</script>

<style scoped>
    .title {
        margin: 0;
        font-size: 1.5em;
        display: flex;
        align-items: center;
        gap: 0.5ch;
    }

    .nav-link {
        font-size: 0.6em;
        text-decoration: none;
        color: inherit;
        margin-bottom: -0.125em;

        &:hover {
            color: var(--col-accent2);
        }
    }

    .short {
        display: inline;
        font-size: 0.8em;
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

        .nav-link {
            margin-bottom: -0.375em;
        }
    }
</style>
