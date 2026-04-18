<template>
    <section class="search-results">
        <SearchForm
            :initial-query="query"
            :initial-events="includeEntries"
            :initial-days="includeDays"
            input-id="page-search"
            large
            class="page-search-form"
        />

        <loading-indicator v-if="!mounted" />

        <template v-else>
            <p v-if="!query">{{ $t('searchEmptyQuery') }}</p>
            <p v-else-if="results.length === 0">{{ $t('searchNoResults') }}</p>

            <TransitionGroup v-else name="list" tag="ul" class="nolist">
                <li v-for="result in pageResults" :key="result.key">
                    <TrackerEntry v-if="result.kind === 'entry'" :entry="result.entry" :deletable="false" show-date />
                    <DayEntry v-else :day="result.day" />
                </li>
            </TransitionGroup>

            <nav v-if="totalPages > 1" class="pagination" :aria-label="$t('pagination')">
                <NuxtLink v-if="page > 1" :to="pageLink(page - 1)" data-button>
                    <nuxt-icon name="arrow_left" />
                    <span>{{ $t('previous') }}</span>
                </NuxtLink>
                <span>{{ $t('pageOf', { page, total: totalPages }) }}</span>
                <NuxtLink v-if="page < totalPages" :to="pageLink(page + 1)" data-button>
                    <span>{{ $t('next') }}</span>
                    <nuxt-icon name="arrow_right" />
                </NuxtLink>
            </nav>
        </template>
    </section>
</template>

<script setup lang="ts">
    import { useSearch } from '~/composables/useSearch';

    const { query, includeEntries, includeDays, page, mounted, results, pageResults, totalPages, pageLink } = useSearch();

    useHead({ title: computed(() => `${query.value || ''} | `) });
</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
        transition-timing-function: var(--animation-bounce);
    }

    .list-enter-from {
        opacity: 0;
        transform: translateY(30px);
        z-index: 2;
    }
    .list-leave-to {
        opacity: 0;
        transform: translateY(0);
        scale: 0.9;
        z-index: 0;
    }
    .list-leave-active {
        position: absolute;
        left: 0;
        right: 0;
    }

    .search-results {
        position: relative;
        padding: 1rem;
        max-width: var(--narrow-width);
        margin: auto;
    }
    
    .page-search-form {
        margin: 1rem auto;
    }

    li {
        margin-block: 1rem;
    }

    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-block-start: 2rem;
    }
</style>
