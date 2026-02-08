<template>
    <header>
        <div class="header-inner">
            <button class="nobutton" @click="handleMenuButtonClick">
                <nuxt-icon name="menu" size="48" />
                <span class="sr-only">Menu</span>
            </button>
            <h1>Today</h1>
        </div>
    </header>
</template>

<script lang="ts" setup>
import { useUiStore } from '~/stores/ui';

const ui = useUiStore();
const handleMenuButtonClick = (): void => {
    ui.toggleMenu(true);
}
</script>

<style>
#__nuxt > header {
    margin-bottom: 0;
}

.header-inner {
    display: flex;
    justify-content: space-between;
    gap: 1rem;

    h1 {
        margin: 0;
        font-size: 2rem;
    }

    svg {
        width: 3rem;
        height: 3rem;
    }
}
</style>
