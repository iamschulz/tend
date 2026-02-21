<template>
    <TransitionGroup name="list" tag="ul" class="nolist" data-group>
        <li ref="loaderEl" key="loader" class="loader" />
        <li v-for="(category, index) in visibleCategories" :key="index" data-avatar data-shadow="2-hover">
            <trigger-button :category="category" />
        </li>
        <li v-if="hasHidden" key="0" data-avatar data-shadow="2" class="allCategories">
            <button @click="ui.toggleTriggerDialog()">
                <nuxt-icon name="apps" size="48" />
                <span class="sr-only">{{ $t('allCategories') }}</span>
            </button>
        </li>
    </TransitionGroup>

    <DialogWrapper name="triggerDialog">
        <ul class="nolist" data-autogrid>
            <li v-for="(category, index) in data.visibleCategories" :key="index" data-avatar data-shadow="2-hover">
                <trigger-button :category="category" />
            </li>
        </ul>
    </DialogWrapper>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';

    const data = useDataStore();
    const ui = useUiStore();

    const loaderEl = ref<HTMLDialogElement | null>(null)

    const visibleCount = ref(5)
    const mq40 = window.matchMedia('(min-width: 40rem)')
    const mq85 = window.matchMedia('(min-width: 85rem)')

    const updateCount = () => {
        visibleCount.value = mq85.matches ? 9 : mq40.matches ? 7 : 5
    }
    updateCount()
    mq40.addEventListener('change', updateCount)
    mq85.addEventListener('change', updateCount)

    const visibleCategories = computed(() => data.visibleCategories.slice(0, visibleCount.value))
    const hasHidden = computed(() => data.visibleCategories.length > visibleCount.value)

    onMounted(() => {
        requestAnimationFrame(() => {
            loaderEl.value?.classList.add('mounted')
        })
    })

    onUnmounted(() => {
        mq40.removeEventListener('change', updateCount)
        mq85.removeEventListener('change', updateCount)
    })
</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
    }

    .list-enter-from {
        opacity: 0;
        transform: translateY(30px);
        z-index: 2;
    }
    .list-leave-to {
        opacity: 0;
        transform: translateY(0);
        scale: 0.9;
        z-index: 0;
    }
    .list-leave-active {
        position: absolute;
    }
    
    ul[data-group] {
        display: flex;
        justify-content: flex-end;
        position: fixed;
        max-width: var(--body-width);
        width: 100%;
        bottom: 2rem;
        margin-block: 0;
        margin-left: -1rem;
        padding: 0 1rem;
        z-index: 1;
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        opacity: 0;
        transform: translateX(1rem);

        &:has(.loader.mounted) {
            opacity: 1;
            transform: translateX(0);
        }
    }

    ul[data-autogrid] {
        grid-template-columns: repeat(auto-fit, 4.5rem);
    }

    [data-avatar] {
        padding: 0;
        font-size: clamp(1.6rem, 3.5vw, 2rem);
        border: none;

        button {
            width: 100%;
            height: 100%;
        }
    }
</style>