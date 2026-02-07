<template>
    <dialog id="menu" ref="menuEl" data-shadow="5">
        <ul class="nolist">
          <li v-if="data.categories.length === 0">Add a tracking category!</li>

          <li v-for="(category, index) in data.categories" :key="index">
              <EditCategoryForm :category="category" />
          </li>

          <hr>

          <li>
              <add-category-form />
          </li>
      </ul>

        <p>
            <button id="closeMenuButton" @click="handleCloseClick">Close</button> <!-- replace with icon -->
        </p>
    </dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useUiStore } from '~/stores/ui';
import EditCategoryForm from './edit-category-form.vue';

const ui = useUiStore();
const handleCloseClick = (): void => {
  ui.toggleMenu(false);
}

const data = useDataStore();

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

    li {
        margin-block: 1rem;
    }

    hr {
        margin: 2rem 0;
    }
}
</style>