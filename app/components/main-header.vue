<template>
    <header data-shadow="2">
        <div class="header-inner">
            <div class="header-controls">
                <button class="nobutton" :aria-pressed="ui.menuOpen" @click="handleMenuButtonClick">
                    <nuxt-icon name="menu" size="48" />
                    <span class="sr-only">{{ $t('menu') }}</span>
                </button>
                <button v-if="showBack" class="nobutton back-button" @click="goBack">
                    <nuxt-icon name="arrow_left" size="48" />
                    <span class="back-label">{{ $t('back') }}</span>
                </button>
            </div>
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

const route = useRoute();
const router = useRouter();

const canGoBack = computed(
    () => route.path === '/' || // day view
    route.path.startsWith('/day/') || // also day view
    route.path.startsWith('/entry/'), // entry view
);

const hasInAppHistory = ref(false);
watch(() => route.fullPath, () => {
    hasInAppHistory.value = import.meta.client && !!window.history.state?.back;
}, { immediate: true });

const showBack = computed(() => canGoBack.value && hasInAppHistory.value);

/** Return to the previous in-app view. */
const goBack = (): void => {
    router.back();
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

.header-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.back-button {
    display: none;
}


.back-label {
    font-family: var(--font-accent, var(--font));
    font-size: 1.5em;
    font-weight: 700;
}

@media (min-width: 38rem) {
    .back-button {
        display: inline-flex;
        align-items: center;
        gap: 0.25ch;

        .nuxt-icon {
            transform: translateY(0.125rem);
        }

        &:hover {
            color: var(--col-accent2);
        }
    }
}
</style>
