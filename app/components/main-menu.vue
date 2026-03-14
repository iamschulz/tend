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
            <p data-group>
                <DataImport />
                <DataExport />
            </p>
            <p>
                <button v-if="data.isServerMode" data-button @click="logout">
                    {{ $t('logout') }}
                </button>
            </p>
        </details>

        <InstallButton />

        <div class="menu-footer">
            <p><span class="appname"><TendIcon /> Tend</span> | made with ♥ | {{ new Date().getFullYear() }}</p>
        </div>
    </DialogWrapper>
</template>

<script lang="ts" setup>
    import DisplaySettings from '~/components/display-settings.vue';
    import { idbStorage } from '~/util/idbStorage';

    const ui = useUiStore();
    const data = useDataStore();
    const { clear } = useUserSession();

    /** Clears the session and local data, then redirects to the login page. */
    async function logout() {
        idbStorage.clear();
        await clear();
        await navigateTo('/login');
    }
</script>

<style scoped>
    .list-move,
    .list-enter-active,
    .list-leave-active {
        --t-opacity: var(--animation-duration);
        --t-transform: var(--animation-duration);
        --t-scale: var(--animation-duration);
        transition-timing-function: var(--animation-bounce);
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

    dialog.menu {
        --menu-width: 28rem;
        max-height: 100svh;
        height: 100svh;
        border-radius: 0 var(--border-radius)(--border-radius) 0;
        width: min(var(--menu-width), 80svw);
        max-width: min(var(--menu-width), 80svw);
        left: calc(-100% + min(var(--menu-width), 80svw));
        animation: dialog-fade-in calc(0.2s * var(--enable-animation, 1)) ease-out;

        h3 {
            margin-block: 0;
        }

        details {
            margin-block: 1rem;
            padding: 1rem;

            summary + * {
                margin-block-start: 1rem;
            }
        }

        hr {
            margin-block: 2rem;
        }

        li {
            margin-block: 1rem;
            width: 100%;
        }

        .menu-footer {
            margin-top: auto;
            width: 100%;
            max-width: min(var(--menu-width), 80svw);
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

        /* fix overscroll transparency */
        &::before {
            content: "";
            display: block;
            position: fixed;
            inset: 0;
            width: min(var(--menu-width), 80svw);
            height: 100%;
            background: var(--col-bg);
            z-index: -1;
        }

        header {
                position: sticky;
                top: 0;
                background-color: var(--col-bg);
                box-shadow: 0 10px 10px 0 var(--col-bg);
                z-index: 1;
            }
    
        .dialog-inner {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
    
        .backdrop {
            inset: unset;
            right: 0;
            top: 0;
            bottom: 0;
            left: min(var(--menu-width), 80svw);
        }
    }
</style>