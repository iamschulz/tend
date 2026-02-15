<template>
    <DialogWrapper ref="menuEl" class="menu" data-shadow="5" name="menu" title="Tend">
        <section>
            <TransitionGroup name="list" tag="ul" class="nolist">
            <li v-if="data.categories.length === 0">{{ $t('addCategoryPrompt') }}</li>

            <li v-for="category in data.categories" :key="category.id">
                <EditCategoryForm :category="category" />
            </li>
            </TransitionGroup>
            <hr>
            <add-category-form />
        </section>

        <hr>

        <TimeSelect v-if="ui.menuOpen" />

        <LanguageSelect />
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

    @keyframes dialog-fade-in {
        from {
            opacity: 0;
            translate: -3rem 0;
        }
        to {
            opacity: 1;
            translate: 0 0;
        }
    }

    @keyframes fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    dialog.menu {
        max-height: 100vh;
        height: 100vh;
        border-radius: 0 var(--border-radius)(--border-radius) 0;
        width: min(400px, 80vw);
        max-width: min(400px, 80vw);
        left: calc(-100% + min(400px, 80vw));
        @media (prefers-reduced-motion: no-preference) {
	    	animation: dialog-fade-in 0.2s ease-out;
	    }

        &::backdrop {
            @media (prefers-reduced-motion: no-preference) {
                animation: fade-in 0.2s ease-out;
            }
        }

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

<style>
    dialog[open].menu .backdrop {
        inset: unset;
        right: 0;
        top: 0;
        bottom: 0;
        left: min(400px, 80vw);
    }
</style>