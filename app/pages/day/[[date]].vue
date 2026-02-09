<template>
    <tracker-day v-if="mounted && routeValid && !isInFuture" :date="date" hydrate-on-visible />
    <p v-else-if="isInFuture">The Future's going to be awesome!</p>
    <p v-else-if="!routeValid">Error</p>
</template>

<script setup lang="ts">
    import { getDayRange } from '~/util/getDayRange'

    const route = useRoute()
    const dateParam = computed<string | null>(() => {
        const d = route.params.date
        return typeof d === 'string' ? d : null
    })

    const isRealDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
    const date = new Date(dateParam.value || '');
    const isInFuture = getDayRange(new Date())[1] <= date;
    const routeValid = dateParam.value && isRealDate(dateParam.value);

    const ui = useUiStore();
    ui.setCurrentViewDate(date);
    
    const mounted = ref(false)

    onMounted(() => {
        mounted.value = true
    })
</script>