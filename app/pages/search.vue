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

            <ul v-else class="nolist">
                <li v-for="result in pageResults" :key="result.key">
                    <NuxtLink v-if="result.kind === 'entry'" :to="`/entry/${result.entry.id}`" data-card data-shadow="1-hover" class="result-card">
                        <span class="icon" :style="{ '--categoryColor': result.entry.category?.color }" aria-hidden="true">
                            {{ result.entry.category?.activity.emoji }}
                        </span>
                        <div class="details">
                            <strong>{{ result.entry.category?.title ?? $t('error') }}</strong>
                            <time>{{ formatTs(result.sortKey) }}</time>
                            <p v-if="result.entry.comment" class="snippet">{{ result.entry.comment }}</p>
                        </div>
                    </NuxtLink>
                    <NuxtLink v-else :to="`/day/${result.day.date}`" data-card data-shadow="1-hover" class="result-card">
                        <span class="icon day-icon" aria-hidden="true">
                            <nuxt-icon name="calendar_month" />
                        </span>
                        <div class="details">
                            <strong>{{ formatDate(result.day.date) }}</strong>
                            <p class="snippet">{{ result.day.notes }}</p>
                        </div>
                    </NuxtLink>
                </li>
            </ul>

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

    const { locale } = useI18n();
    const { query, includeEntries, includeDays, page, mounted, results, pageResults, totalPages, pageLink } = useSearch();

    /** @param ts - Epoch ms to format as a localized date + time */
    function formatTs(ts: number) {
        return new Date(ts).toLocaleString(locale.value, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    /** @param dateStr - YYYY-MM-DD string to format as a localized date */
    function formatDate(dateStr: string) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(locale.value, {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    }

    useHead({ title: computed(() => `${query.value || ''} | `) });
</script>

<style scoped>
    .search-results {
        padding: 1rem;
        max-width: var(--narrow-width);
        margin: auto;
    }

    .page-search-form {
        margin: auto;
    }

    .result-card {
        display: grid;
        grid-template-columns: 4rem 1fr;
        gap: 1rem;
        padding: 0;
        margin-block: 1rem;
        text-decoration: none;
        color: inherit;
    }

    .icon {
        display: grid;
        place-items: center;
        background-color: var(--categoryColor, var(--col-bg2));
        font-size: 1.8rem;
        border-radius: var(--border-radius) 0 0 var(--border-radius);
    }

    .day-icon {
        color: var(--col-fg2);
    }

    .details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.75rem 1rem 0.75rem 0;
        min-width: 0;
    }

    time {
        color: var(--col-fg2);
        font-size: 0.9rem;
    }

    .snippet {
        margin: 0;
        color: var(--col-fg2);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-block-start: 2rem;
    }
</style>
