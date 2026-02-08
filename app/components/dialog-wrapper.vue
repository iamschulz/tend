<template>
    <dialog ref="dialogEl">
        <div class="backdrop" @click="() => closeDialog()" />
        <button class="closeButton nobutton" @click="() => closeDialog()">
            <nuxt-icon name="close" size="36" />
            <span class="sr-only">Close</span>
        </button>
        <div class="dialog-inner">
            <slot />
        </div>
    </dialog>
</template>

<script setup lang="ts">
import type { StoreActions, StoreGetters } from 'pinia';
import { capitalize } from 'vue';

    defineOptions({
        inheritAttrs: false
    })

    const ui = useUiStore();
    type GetterKey = keyof StoreGetters<typeof ui>
    type SetterKey = keyof StoreActions<typeof ui>

    const props = defineProps<{
        name: GetterKey
    }>()

    const name = props.name;
    const toggleFunction = `toggle${capitalize(name)}` as SetterKey;
    
    const dialogEl = ref<HTMLDialogElement | null>(null)

    watch(
        () => ui[name],
        (open) => {
            const dialog = dialogEl.value!

            if (open && !dialog.open) {
            dialog.showModal()
            } else if (!open && dialog.open) {
            dialog.close()
            }
        }
    )

    const closeDialog = () => {
        ui[toggleFunction](false);
    }
</script>

<style scoped>
    dialog[open] {
        width: 100%;
        height: 100%;
        min-height: 80vh;
        max-width: 90vw;
        padding-top: 3rem;

        .closeButton {
            position: absolute;
            right: 1rem;
            top: 1rem;
            width: 2.5rem;
            height: 2.5rem;
            font-size: 2rem;
            display: grid;
            place-content: center;
        }

        .backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999999;
            opacity: 0.5;
            z-index: -1;
        }
    }
</style>