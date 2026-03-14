<template>
    <header data-shadow="2">
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
/** Opens the main menu. */
const handleMenuButtonClick = (): void => {
    ui.toggleMenu(true);
}

const headerEl = ref<HTMLElement | null>(null)
const scrolled = ref(0)

/** Updates the scroll progress value for the header collapse effect. */
const onScroll = () => {
    scrolled.value = Math.min(window.scrollY / 20, 1)
}

onMounted(() => {
    headerEl.value = document.querySelector('#__nuxt > header')
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
})

onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
})

watch(scrolled, (amount) => {
    headerEl.value?.style.setProperty('--scrolled', String(Math.min(1, Math.max(0, amount))))
})
</script>

<style>
@property --scrolled {
    syntax: "<number>";
    inherits: true;
    initial-value: 0;
}

#__nuxt > header {
    --scrolled: 0;
    --shadow-level: calc(var(--scrolled, 0) * 2);
    margin-bottom: 0;
    position: sticky;
    top: 0;
    z-index: 1;
    view-transition-name: main-header;
    font-size: calc(1rem * (1 - var(--scrolled) * var(--enable-animation, 1) * 0.2));
    padding-block: calc(1rem * (1 - var(--scrolled) * var(--enable-animation, 1) * 0.8));
    transition: --scrolled var(--animation-duration) var(--animation-bounce);
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
