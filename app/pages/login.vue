<template>
    <div class="login-page">
        <form class="login-form" @submit.prevent="isRegistering ? register() : login()">
            <h1><TendIcon /> Tend</h1>

            <a
                v-if="providers?.google"
                class="oauth-button"
                href="/api/auth/google"
            >
                {{ $t('login.withGoogle') }}
            </a>
            <a
                v-if="providers?.apple"
                class="oauth-button"
                href="/api/auth/apple"
            >
                {{ $t('login.withApple') }}
            </a>
            <a
                v-if="providers?.github"
                class="oauth-button"
                href="/api/auth/github"
            >
                {{ $t('login.withGitHub') }}
            </a>
            <a
                v-if="providers?.oidc"
                class="oauth-button"
                href="/api/auth/oidc"
            >
                {{ $t('login.withOidc') }}
            </a>

            <div v-if="hasOAuthProvider" class="divider">
                <span>{{ $t('login.or') }}</span>
            </div>

            <label v-if="isRegistering">
                <span class="sr-only">{{ $t('login.name') }}</span>
                <label for="name">{{ $t('login.name') }}</label>
                <input
                    id="name"
                    v-model="name"
                    type="text"
                    autocomplete="name"
                    required
                >
            </label>
            <label>
                <span class="sr-only">{{ isRegistering ? $t('login.email') : $t('login.username') }}</span>
                <label for="username">{{ isRegistering ? $t('login.email') : $t('login.username') }}</label>
                <input
                    id="username"
                    v-model="username"
                    :type="isRegistering ? 'email' : 'text'"
                    :autocomplete="isRegistering ? 'email' : 'username'"
                    required
                >
            </label>
            <label>
                <span class="sr-only">{{ $t('login.password') }}</span>
                <label for="password">{{ $t('login.password') }}</label>
                <input
                    id="password"
                    v-model="password"
                    type="password"
                    :autocomplete="isRegistering ? 'new-password' : 'current-password'"
                    :minlength="isRegistering ? 8 : undefined"
                    required
                >
            </label>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <button type="submit" :disabled="loading">
                {{ isRegistering ? $t('login.createAccount') : $t('login.submit') }}
            </button>
            <button type="button" class="toggle-button" @click="toggleMode">
                {{ isRegistering ? $t('login.hasAccount') : $t('login.noAccount') }}
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
if (config.public.backendMode !== 'server') {
    await navigateTo('/', { replace: true })
}

const { $i18n } = useNuxtApp()
const { fetch: fetchSession } = useUserSession()

const { data: providers } = await useFetch('/api/auth/providers')

const hasOAuthProvider = computed(() =>
    providers.value?.google || providers.value?.apple || providers.value?.github || providers.value?.oidc,
)

const isRegistering = ref(false)
const username = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const loading = ref(false)

function toggleMode() {
    isRegistering.value = !isRegistering.value
    error.value = ''
}

/** Submits credentials and redirects to home on success. */
async function login() {
    error.value = ''
    loading.value = true
    try {
        await $fetch('/api/auth/login', {
            method: 'POST',
            body: { username: username.value, password: password.value },
        })
        await fetchSession()
        await navigateTo('/')
    }
    catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode
        error.value = status === 429
            ? $i18n.t('login.rateLimited')
            : $i18n.t('login.error')
    }
    finally {
        loading.value = false
    }
}

/** Registers a new account and redirects to home on success. */
async function register() {
    error.value = ''
    loading.value = true
    try {
        await $fetch('/api/auth/register', {
            method: 'POST',
            body: { email: username.value, name: name.value, password: password.value },
        })
        await fetchSession()
        await navigateTo('/')
    }
    catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode
        error.value = status === 429
            ? $i18n.t('login.rateLimited')
            : status === 403
                ? $i18n.t('login.notAllowed')
                : $i18n.t('login.error')
    }
    finally {
        loading.value = false
    }
}
</script>

<style scoped>
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: min(20rem, 90vw);
}

.login-form h1 {
    font-family: var(--font-accent);
    text-align: center;
    margin-bottom: 0.5rem;
}

.login-form input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--col-fg2);
    border-radius: var(--border-radius);
    background: var(--col-bg3);
    color: var(--col-fg);
    font-family: var(--font);
    font-size: 1rem;
}

.login-form button {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: var(--border-radius);
    background: var(--col-accent);
    color: var(--col-bg3);
    font-family: var(--font);
    font-size: 1rem;
    cursor: pointer;
}

.login-form button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.toggle-button {
    background: none;
    color: var(--col-fg2);
    font-size: 0.875rem;
    text-decoration: underline;
}

.oauth-button {
    display: block;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--col-fg2);
    border-radius: var(--border-radius);
    background: var(--col-bg3);
    color: var(--col-fg);
    font-family: var(--font);
    font-size: 1rem;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
}

.oauth-button:hover {
    background: var(--col-bg2);
}

.divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--col-fg2);
    font-size: 0.875rem;
}

.divider::before,
.divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--col-fg2);
}

.error {
    color: var(--col-accent2);
    font-size: 0.875rem;
    margin: 0;
}
</style>
