<template>
    <TransitionGroup name="list" tag="ul" class="nolist" data-group>
        <div ref="loaderEl" class="loader" />
        <li v-for="(category, index) in data.categories" :key="index" data-avatar data-shadow="2-hover">
            <trigger-button :category="category" />
        </li>
    </TransitionGroup>
</template>

<script setup lang="ts">
    import { useDataStore } from '~/stores/data';

    const data = useDataStore();

    const loaderEl = ref<HTMLDialogElement | null>(null)

    onMounted(() => {
        requestAnimationFrame(() => {
            loaderEl.value?.classList.add('mounted')
        })
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
    
    ul {
        display: flex;
        justify-content: flex-end;
        position: fixed;
        max-width: var(--body-width);
        width: 100%;
        bottom: 2rem;
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

    [data-avatar] {
        padding: 0;
        font-size: 2rem;
        border: none;
    }
</style>