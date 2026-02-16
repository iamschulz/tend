<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <tracker-day v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <p v-else-if="!routeValid">{{ $t('error') }}</p>
    </div>
</template>

<script setup lang="ts">
    import { getDayRange } from '~/util/getDayRange'

    const route = useRoute()
    const dateParam = computed<string | null>(() => {
        const d = route.params.date
        return typeof d === 'string' ? d : null
    })

    // YYYY-MM-DD validation
    const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

    // Fallback to current date if param is missing
    const date = new Date(dateParam.value || '');

    // Compare by day range
    const isInFuture = getDayRange(new Date())[1] <= date;

    
    const routeValid = dateParam.value && isRealDate(dateParam.value);

    const ui = useUiStore();
    ui.setCurrentViewDate(date);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mounted = ref(false)

    onNuxtReady(() => {
        mounted.value = true
    })

    onBeforeUnmount(() => {
        mounted.value = false
    })
</script>