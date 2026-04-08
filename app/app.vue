<template>
  <template v-if="serverLoading">
    <loading-indicator />
  </template>
  <template v-else>
    <main-header v-if="route.path !== '/login'" />
    <LazyMainMenu v-if="ready" />
    <LazyConfirmDialog v-if="ready" />
    <LazyErrorDialog v-if="ready" />
    <ToastNotification
      v-for="(toast, i) in toasts"
      :key="toast.id"
      :toast="toast"
      :index="i"
      @close="removeToast"
    >
      <ToastContent :toast="toast" />
    </ToastNotification>
    <main>
      <NuxtPage />
      <LazyTriggerGroup v-if="ready" />
    </main>
  </template>
  <ClientOnly><NuxtRouteAnnouncer /></ClientOnly>
  <div aria-live="assertive" class="announcer">{{ announcement }}</div>
</template>

<script setup lang="ts">
    const { locale, t } = useI18n()
    useHead({
        htmlAttrs: { lang: locale },
        meta: [{ name: 'description', content: /** @returns Localised meta description */ () => t('meta.description') }]
    })

    const { registerAnnouncer } = useAnnounce()
    const announcement = registerAnnouncer('root', () => !document.querySelector('dialog[open]'))

    const { toasts, removeToast } = useToast()

    const data = useDataStore()
    const config = useRuntimeConfig()
    const route = useRoute()

    const serverLoading = computed(() =>
        config.public.backendMode === 'server'
        && !data.serverHydrated
        && route.path !== '/login'
    )

    const { user } = useUserSession()

    if (import.meta.client) {
        watch(serverLoading, async (loading) => {
            if (loading) {
                try { await data.hydrateFromServer() }
                catch { data.serverHydrated = true }
            }
        }, { immediate: true })

        // Re-hydrate when user identity changes (e.g. session expiry + re-login as different user)
        watch(() => user.value?.id, async (newId, oldId) => {
            if (oldId && newId && newId !== oldId) {
                data.serverHydrated = false
                try { await data.hydrateFromServer() }
                catch { data.serverHydrated = true }
            }
        })
    }

    const ready = ref(false)
    const scope = getCurrentScope()
    onNuxtReady(() => {
        ready.value = true
        scope!.run(() => useGoalCompletionWatcher(t))
    })

    const router = useRouter()
    router.beforeEach((to) => {
        document.documentElement.style.setProperty('--bounce-factor',
            to.path.startsWith('/entry/') ? '0.3' : ''
        )
    })
</script>

<style>
  @import "ssstyles/css/base.css" layer(base);
  @import "ssstyles/css/themes/business.css" layer(theme);
  @import "ssstyles/css/transition.css" layer(components);
  @import "ssstyles/css/basegrid.css" layer(components);
  @import "ssstyles/css/headline.css" layer(components);
  @import "ssstyles/css/actionlink.css" layer(components);
  @import "ssstyles/css/group.css" layer(components);
  @import "ssstyles/css/carousel.css" layer(components);
  @import "ssstyles/css/card.css" layer(components);
  @import "ssstyles/css/avatar.css" layer(components);
  @import "ssstyles/css/animation.css" layer(components);
  @import "ssstyles/css/shadow.css" layer(components);
  @import "ssstyles/css/loading.css" layer(components);
  @import "ssstyles/css/autogrid.css" layer(components);
  @import "ssstyles/css/toggle.css" layer(components);

  body {
    margin: 0;
  }

  #__nuxt {
    overflow-x: initial;
    isolation: isolate;
  }

  main {
    padding-bottom: 8rem;
  }

  .announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    border: 0;
  }

  .nuxt-route-announcer {
    width: 1px;
  }

  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }

  ::view-transition-group(*) {
    animation-duration: var(--animation-duration);
    animation-timing-function: var(--animation-bounce);
  }

  ::view-transition-group(main-header),
  ::view-transition-group(trigger-group) {
    z-index: 2;
  }

  ::view-transition-old(main-header),
  ::view-transition-old(trigger-group) {
    display: none;
  }

  ::view-transition-new(main-header),
  ::view-transition-new(trigger-group) {
    animation: none;
  }
</style>