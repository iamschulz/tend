<template>
    <div>
        <loading-indicator v-if="!mounted" />
        <LazyTrackerDay v-else-if="routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">{{ $t('futureMessage') }}</p>
        <ErrorNotice v-else-if="!routeValid" />
    </div>
</template>

<script setup lang="ts">
    const route = useRoute()
    const dateParam = computed<string | null>(() => {
        const d = route.params.date
        return typeof d === 'string' ? d : null
    })

    // YYYY-MM-DD validation
    const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

    // Fallback to current date if param is missing
    const date = new Date(dateParam.value || '');

    const routeValid = dateParam.value && isRealDate(dateParam.value);

    // Compare by local day, not UTC
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const isInFuture = routeValid && dateParam.value! > todayStr;

    const ui = useUiStore();
    ui.setCurrentViewDate(date);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const nuxtApp = useNuxtApp()
    const mounted = ref(!nuxtApp.isHydrating)

    onNuxtReady(() => {
        mounted.value = true
    })
</script>