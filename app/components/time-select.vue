<template>
    <section class="selectMenu">
            <h3>Select day</h3>
            <form data-group @submit.prevent="onDaySelect">
                <NuxtLink href="/">Today</NuxtLink>
                <NuxtLink :href="`/day/${yesterday}`">Yesterday</NuxtLink>
                <input ref="daySelectEl" type="date" :value="new Date().toISOString().split('T')[0]">
                <button type="submit">Go</button>
            </form>
            <div data-group>
                <a href="#" >Week</a>
                <a href="#" >Month</a>
                <a href="#" >Year</a>
            </div>
        </section>
</template>

<script lang="ts" setup>
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10);

    const daySelectEl = useTemplateRef('daySelectEl');
    const onDaySelect = () => {
        navigateTo(`/day/${daySelectEl.value?.value}`)
    }
</script>

<style scoped>
    a {
        display: grid;
        place-items: center;
        background-image: none;
        background-color: var(--col-accent);
        padding: 0.25rem 1ch;
        border-radius: var(--br-tl, var(--border-radius)) var(--br-tr, var(--border-radius)) var(--br-br, var(--border-radius)) var(--br-bl, var(--border-radius));
        color: var(--col-accent-contrast);
        font-weight: 500;
        text-decoration: none;
    }
</style>