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
@property --scrolled {
    syntax: "<number>";
    inherits: true;
    initial-value: 0;
}

@keyframes scrolled {
    to {
        --scrolled: 1;
    }
}

#__nuxt > header {
    --scrolled: 0;
    margin-bottom: 0;
    position: sticky;
    top: 0;
    z-index: 1;
    box-shadow: 0 calc(5px * var(--scrolled)) calc(5px * var(--scrolled)) 0 var(--col-bg3);
    font-size: calc(1rem * (1 - var(--scrolled) * 0.2));
    padding-block: calc(1rem * (1 - var(--scrolled) * 0.8));

    @supports (animation-timeline: scroll()) {
        animation: scrolled ease-out both;
        animation-timeline: scroll();
        animation-range: 0px 20px;
    }
}

.header-inner {
    display: flex;
    justify-content: space-between;
    gap: 1rem;

    svg {
        width: 2em;
        height: 2em;
    }
}
</style>
