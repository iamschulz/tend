<template>
    <form :class="{ large }" @submit.prevent="submit">
        <label class="sr-only" :for="inputId">{{ $t('search') }}</label>
        <div data-group>
            <input :id="inputId" v-model="q" type="search" class="search-input">
            <button type="submit">
                <nuxt-icon name="search" />
                <span class="sr-only">{{ $t('search') }}</span>
            </button>
        </div>
        <div class="search-controls">
            <label class="search-option">
                <input v-model="events" type="checkbox" data-toggle>
                {{ $t('searchEvents') }}
            </label>
            <label class="search-option">
                <input v-model="days" type="checkbox" data-toggle>
                {{ $t('searchDays') }}
            </label>
        </div>
    </form>
</template>

<script setup lang="ts">
    const props = withDefaults(defineProps<{
        initialQuery?: string
        initialEvents?: boolean
        initialDays?: boolean
        inputId?: string
        large?: boolean
    }>(), {
        initialQuery: '',
        initialEvents: true,
        initialDays: true,
        inputId: 'search',
        large: false,
    });

    const q = ref(props.initialQuery);
    const events = ref(props.initialEvents);
    const days = ref(props.initialDays);

    /** Navigates to the search results page with the current form values. */
    function submit() {
        const trimmed = q.value.trim();
        if (!trimmed) return;
        navigateTo({
            path: '/search',
            query: {
                q: trimmed,
                events: events.value ? '1' : '0',
                days: days.value ? '1' : '0',
            },
        });
    }

    // Toggling scope re-runs the search when there's already a query; no-op otherwise.
    watch([events, days], () => submit());
</script>

<style scoped>
    [data-group] {
        width: 100%;
        justify-content: center;
    }

    .large [data-group] {
        font-size: 1.5rem;
    }

    .search-option {
        display: block;
        margin-block: 1rem;
    }

    .search-input {
        display: block;
    }

    .search-controls {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }
</style>
