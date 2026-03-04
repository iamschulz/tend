<template>
  <main-header />
  <LazyMainMenu v-if="ready" />
  <LazyConfirmDialog v-if="ready" />
  <LazyErrorDialog v-if="ready" />
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

    const ready = ref(false)
    onNuxtReady(() => {
        ready.value = true
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

  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }

  ::view-transition-group(*) {
    animation-duration: var(--animation-duration);
    animation-timing-function: var(--animation-bounce);
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