<template>
    <dialog id="menu" data-shadow="5" ref="menuEl">
        <ul>
            <li>nothing here yet</li>
        </ul>
        <p>
            <button id="closeMenuButton" @click="handleCloseClick">Close</button> <!-- replace with icon -->
        </p>
    </dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useUiStore } from '~/stores/ui';

const ui = useUiStore();
const handleCloseClick = (): void => {
    ui.toggleMenu(false);
}
    
const menuEl = ref<HTMLDialogElement | null>(null)

watch(
  () => ui.isMenuOpen,
  (open) => {
    const dialog = menuEl.value!

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }
)
</script>

<style scoped>
#menu {
    min-height: 80vh;
}
</style>