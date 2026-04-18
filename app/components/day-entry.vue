<template>
    <article data-card data-shadow="1-hover" class="day-card">
        <NuxtLink data-card-link :to="`/day/${day.date}`" :aria-label="day.date" />
        <span class="icon" aria-hidden="true">
            <nuxt-icon name="calendar_month" />
        </span>
        <div class="details">
            <h2><time>{{ formattedDate }}</time></h2>
            <span v-if="day.notes">
                <nuxt-icon name="notes" />
                {{ truncatedNotes }}
            </span>
        </div>
    </article>
</template>

<script setup lang="ts">
    import type { Day } from '~/types/Day';

    const props = defineProps<{
        day: Day
    }>()

    const { locale } = useI18n()

    const formattedDate = computed(() => {
        const [y, m, d] = props.day.date.split('-').map(Number)
        return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(locale.value, {
            year: 'numeric', month: 'long', day: 'numeric',
        })
    })

    const notesLimit = 50
    const truncatedNotes = computed(() => {
        const notes = props.day.notes
        if (notes.length <= notesLimit) return notes
        const slice = notes.slice(0, notesLimit)
        const lastSpace = slice.search(/\s\S*$/)
        const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice
        return `${cut.trimEnd()}…`
    })
</script>

<style scoped>
    .day-card {
        display: grid;
        grid-template-columns: 4rem 1fr;
        gap: 1rem;
        padding: 0;
        text-decoration: none;
        color: inherit;
    }

    .icon {
        display: grid;
        place-items: center;
        background-color: var(--col-bg3);
        color: var(--col-fg2);
        font-size: 1.8rem;
        border-radius: var(--border-radius) 0 0 var(--border-radius);
        margin: 0;
    }

    h2 {
        margin: 0;
    }

    .details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0;
        padding: 1rem 1rem 1rem 0;
        min-width: 0;
    }
</style>
