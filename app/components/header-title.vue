<template>
    <h1 class="title">{{ title }}</h1>
</template>

<script setup lang="ts">
    const title = ref("Habits")

    const ui = useUiStore();
    const route = useRoute();

    const isToday = (d: Date) => d.toDateString() === new Date(Date.now()).toDateString()
    const isYesterday = (d: Date) => d.toDateString() === new Date(Date.now() - 864e5).toDateString()

    const setTitle = () => {
        if (route.name === "index") {
            title.value = "Today"
        } else if (route.name === "day-date") {
            if (isToday(ui.currentViewDate)) {
                title.value = "Today";
            } else if (isYesterday(ui.currentViewDate)) {
                title.value = "Yesterday";
            } else {
                title.value = new Date(ui.currentViewDate).toLocaleDateString([], {
                    weekday: 'short', day: 'numeric', month: 'short'
                })
            }
        }
    }

    setTitle();

    watch(() => route.fullPath, () => {
        setTitle();
    })
</script>

<style scoped>
    .title {
        margin: 0;
        font-size: 2rem;
    }
</style>