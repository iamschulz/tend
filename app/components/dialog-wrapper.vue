<template>
    <dialog ref="dialogEl" data-shadow="5">
        <header>
            <div class="headline">
                <nuxt-icon v-if="icon" :name="icon" filled />
                <h2 v-if="title">{{ title }}</h2>
            </div>
            <button class="closeButton nobutton" @click="() => closeDialog()">
                <nuxt-icon name="close" size="36" />
                <span class="sr-only">{{ $t('close') }}</span>
            </button>
        </header>
        <div class="dialog-inner">
            <slot />
        </div>
        <div class="backdrop" @click="() => closeDialog()" />
        <div aria-live="assertive" class="announcer">{{ announcerText }}</div>
    </dialog>
</template>

<script setup lang="ts">
    import type { _StoreObject, StoreActions, StoreGetters } from 'pinia';
    import { capitalize } from 'vue';

    defineOptions({
        inheritAttrs: true
    })

    const ui = useUiStore();
    type GetterKey = keyof StoreGetters<typeof ui>
    type SetterKey = keyof StoreActions<typeof ui>
    type StoreObject = keyof _StoreObject<typeof ui>

    const props = defineProps<{
        name: GetterKey,
        title?: string,
        icon?: string,
    }>()

    const name = props.name;
    const toggleFunction = `toggle${capitalize(name)}` as SetterKey;
    
    const dialogEl = ref<HTMLDialogElement | null>(null)

    const { registerAnnouncer } = useAnnounce()
    const announcerText = registerAnnouncer(`dialog-${name}`, () => dialogEl.value?.open ?? false)

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

    onMounted(() => {
        dialogEl.value!.addEventListener('close', closeDialog)
    })

    /** Closes the dialog and updates the UI store. */
    const closeDialog = () => {
        ui[toggleFunction](false as StoreObject);
        dialogEl.value!.blur();
    }
</script>

<style scoped>
    @keyframes backdrop-fade-in {
        from {
            opacity: 0;
        }
        
        to {
            opacity: 1;
        }
    }

    dialog[open] {
        max-width: min(90vw, calc(var(--body-width) - 1rem));

        header {
            display: flex;
            justify-content: flex-end;
            min-height: 3.5rem;
            padding-right: 0.6rem;
            background: transparent;

            .headline {
                width: 100%;
            }

            h2 {
                display: inline;
                margin-block: 0;
                flex: 1 0 auto;
            }

            .nuxt-icon {
                font-size: 1.5rem;
            }

            .closeButton {
                width: 2.5rem;
                height: 2.5rem;
                font-size: 2rem;
                display: grid;
                place-content: center;
            }
        }

        .backdrop {
            position: fixed;
            inset: 0;
            z-index: -1;
        }

        &::backdrop {
            animation: backdrop-fade-in calc(0.2s * var(--enable-animation, 1)) ease-out;
        }
    }

    .announcer {
        padding: 0;
    }
</style>