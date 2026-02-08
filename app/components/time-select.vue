<template>
    <section class="selectMenu">
            <h3>Select day</h3>
            <form data-group>
                <a href="#">Today</a>
                <a href="#">Yesterday</a>
                <input type="date" :value="new Date().toISOString().split('T')[0]">
            </form>
            <div data-group>
                <a href="#" >Day</a>
                <a href="#" >Week</a>
                <a href="#" >Month</a>
                <a href="#" >Year</a>
            </div>
        </section>
</template>

<script lang="ts" setup>
    // use input to navigate to selected day
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