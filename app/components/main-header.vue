<template>
    <header>
        <div class="header-inner">
            <button class="nobutton" :aria-pressed="ui.menuOpen" @click="handleMenuButtonClick">
                <nuxt-icon name="menu" size="48" />
                <span class="sr-only">{{ $t('menu') }}</span>
            </button>
            <HeaderTitle />
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

    svg {
        width: 3rem;
        height: 3rem;
    }
}
</style>
