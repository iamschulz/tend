<template>
  <main-header />
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
    <div v-if="toast.goals?.length" class="toast-goal">
      <span>{{ toast.message }}</span>
      <div v-for="(goal, gi) in toast.goals" :key="gi" class="toast-goal-row">
        <span class="toast-goal-label">{{ goal.count }}{{ unitSuffix[goal.unit] }} / {{ $t(`per${goal.interval.charAt(0).toUpperCase()}${goal.interval.slice(1)}`) }}</span>
        <AnimatedProgress :goal="goal" :category-id="toast.categoryId!" />
      </div>
    </div>
    <span v-else>{{ toast.message }}</span>
  </ToastNotification>
  <main>
    <NuxtPage />
    <LazyTriggerGroup v-if="ready" />
  </main>
  <NuxtRouteAnnouncer />
  <div aria-live="assertive" class="announcer">{{ announcement }}</div>
</template>

<script setup lang="ts">
    const { locale } = useI18n()
    useHead({
        htmlAttrs: { lang: locale }
    })

    const { registerAnnouncer } = useAnnounce()
    const announcement = registerAnnouncer('root', () => !document.querySelector('dialog[open]'))

    const { toasts, removeToast } = useToast()
    const unitSuffix: Record<string, string> = { event: 'x', minutes: 'm', hours: 'h', days: 'd' }

    const ready = ref(false)
    onNuxtReady(() => {
        ready.value = true
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
  @import "ssstyles/css/callout.css" layer(components);

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

  .toast-goal {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toast-goal-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .toast-goal-label {
    flex-shrink: 0;
    font-size: 0.85rem;
    white-space: nowrap;
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

  ::view-transition-old(main-header) {
    display: none;
  }

  ::view-transition-new(main-header),
  ::view-transition-old(trigger-group),
  ::view-transition-new(trigger-group) {
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
      animation: none !important;
    }

    .list-move,
    .list-enter-active,
    .list-leave-active {
      transition: none !important;
    }

    .list-enter-from,
    .list-leave-to {
      opacity: 1 !important;
      transform: none !important;
    }
  }

  body.reduced-motion {
    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
      animation: none !important;
    }

    .list-move,
    .list-enter-active,
    .list-leave-active {
      transition: none !important;
    }

    .list-enter-from,
    .list-leave-to {
      opacity: 1 !important;
      transform: none !important;
    }
  }
</style>