<template>
    <DialogWrapper ref="menuEl" class="menu" data-shadow="5" name="menu" title="Settings">
        <section>
            <TransitionGroup name="list" tag="ul" class="nolist">
            <li v-if="data.categories.length === 0">Add a tracking category!</li>

            <li v-for="category in data.categories" :key="category.id">
                <EditCategoryForm :category="category" />
            </li>
            </TransitionGroup>
            <hr>
            <add-category-form />
        </section>

        <hr>

        <TimeSelect v-if="ui.menuOpen" />
    </DialogWrapper>
</template>

<script lang="ts" setup>
    const ui = useUiStore();
    const data = useDataStore();
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
            transform: translateY(10px);
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
            left: 0;
        }

    .menu {
        ul {
        position: relative;
        }

        li {
            margin-block: 1rem;
        }

        hr {
            margin: 2rem 0;
        }
    }
</style>