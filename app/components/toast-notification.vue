<template>
    <div
        ref="popoverEl"
        popover="manual"
        role="status"
        class="toast"
        :style="{ '--toast-index': index }"
        data-card
        data-shadow="5"
    >
        <slot>{{ toast.message }}</slot>
        <button class="closeButton nobutton" @click="close">
            <nuxt-icon name="close" size="36" />
            <span class="sr-only">{{ $t('close') }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
    import type { Toast } from '~/composables/useToast'

    const props = defineProps<{
        toast: Toast
        index: number
    }>()

    const emit = defineEmits<{
        close: [id: string]
    }>()

    const popoverEl = ref<HTMLElement | null>(null)
    let timerId: ReturnType<typeof setTimeout> | null = null

    /** Hides the popover and emits the close event. */
    const close = () => {
        popoverEl.value?.hidePopover()
        emit('close', props.toast.id)
    }

    onMounted(() => {
        popoverEl.value?.showPopover()

        if (props.toast.duration > 0) {
            timerId = setTimeout(close, props.toast.duration)
        }
    })

    onUnmounted(() => {
        if (timerId) clearTimeout(timerId)
    })
</script>

<style scoped>
    .toast {
        inset: unset;
        margin: 0 auto;
        position: fixed;
        top: calc(0.75rem + var(--toast-index) * 4rem);
        left: 0;
        right: 0;
        width: calc(100% - 2rem);
        max-width: min(60vw, calc(var(--body-width) - 1rem));
        opacity: 1;

        transition:
            opacity var(--animation-duration) ease-out,
            translate var(--animation-duration) var(--animation-bounce),
            display var(--animation-duration) allow-discrete;

        @starting-style {
            opacity: 0;
            translate: 0 -1rem;
        }
    }

    .closeButton {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        width: 2.5rem;
        height: 2.5rem;
        font-size: 2rem;
        display: grid;
        place-content: center;

        .nuxt_icon {
            font-size: 1.4rem;
        }
    }
</style>
