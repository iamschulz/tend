<template>
    <DialogWrapper ref="menuEl" class="menu" data-shadow="5" name="menu" title="Tend" icon="tend">
        <details :open="!!data.categories.length" >
            <summary><h3>{{ $t('selectDay') }}</h3></summary>
            <TimeSelect v-if="ui.menuOpen" />
        </details>

        <details :open="!data.categories.length">
            <summary><h3>{{ $t('categories') }}</h3></summary>
            <TransitionGroup name="list" tag="ul" class="nolist">
            <li v-if="data.categories.length === 0" key="0">{{ $t('addCategoryPrompt') }}</li>

            <li v-for="category in data.categories" :key="category.id">
                <EditCategoryForm :category="category" />
            </li>
            </TransitionGroup>
            <hr>
            <AddCategoryForm />
        </details>

        <details>
            <summary><h3>{{ $t('settings') }}</h3></summary>
            <LanguageSelect />
            <DisplaySettings />
        </details>

        <details>
            <summary><h3>{{ $t('data') }}</h3></summary>
            <div data-group>
                <DataImport />
                <DataExport />
            </div>
        </details>

        <InstallButton />

        <div class="menu-footer">
            <p><span class="appname"><nuxt-icon name="tend" filled /> Tend</span> | made with ♥ | {{ new Date().getUTCFullYear() }}</p>
        </div>
    </DialogWrapper>
</template>

<script lang="ts" setup>
    import DisplaySettings from '~/assets/icons/display-settings.vue';

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
        --menu-width: 440px;
        max-height: 100vh;
        height: 100vh;
        border-radius: 0 var(--border-radius)(--border-radius) 0;
        width: min(var(--menu-width), 80vw);
        max-width: min(var(--menu-width), 80vw);
        left: calc(-100% + min(var(--menu-width), 80vw));
        @media (prefers-reduced-motion: no-preference) {
	    	animation: dialog-fade-in 0.2s ease-out;
	    }

        &::backdrop {
            @media (prefers-reduced-motion: no-preference) {
                animation: fade-in 0.2s ease-out;
            }
        }

        h3 {
            margin-block: 0;
        }

        details {
            margin-block: 1rem;

            summary + * {
                margin-block-start: 2rem;
            }
        }

        hr {
            margin-block: 2rem;
        }

        li {
            margin-block: 1rem;
        }

        .menu-footer {
            margin-top: auto;
            width: 100%;
            max-width: min(var(--menu-width), 80vw);
            color: var(--col-fg2);

            .appname {
                color: var(--col-fg);
                font-weight: 700;
            }
        }
    }
</style>

<style>
    dialog[open].menu {
        display: flex;
        flex-direction: column;
    }

    dialog[open].menu .dialog-inner {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    dialog[open].menu .backdrop {
        inset: unset;
        right: 0;
        top: 0;
        bottom: 0;
        left: min(var(--menu-width), 80vw);
    }
</style>