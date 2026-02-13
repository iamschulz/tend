<template>
    <div>
        <Teleport v-if="mounted" to="#header-title-long">
            {{ dayTitle.long }}
        </Teleport>
        <Teleport v-if="mounted" to="#header-title-short">
            {{ dayTitle.short }}
        </Teleport>
        <tracker-day v-if="mounted && routeValid && !isInFuture" :date="date" />
        <p v-else-if="isInFuture">The Future's going to be awesome!</p>
        <p v-else-if="!routeValid">Error</p>
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

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const dayTitle: ComputedRef<{ short: string; long: string; }> = computed(() => {
        if (isToday) return { short: 'Today', long: 'Today' };
        if (isYesterday) return { short: 'Yesterday', long: 'Yesterday' };
        return {
            short: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
            long: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
        };
    });

    const mounted = ref(false)

    onMounted(() => {
        mounted.value = true
    })
</script>