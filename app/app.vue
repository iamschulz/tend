<template>
  <main-header />
  <main-menu v-if="ready" />
  <confirm-dialog v-if="ready" />
  <error-dialog v-if="ready" />
  <main>
    <NuxtPage />
    <NuxtRouteAnnouncer />
    <TriggerGroup v-if="ready" />
  </main>
  
</template>

<script setup lang="ts">
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

  body {
    margin: 0;
  }

  #__nuxt {
    overflow-x: initial;
  }

  main {
    padding-bottom: 8rem;
  }
</style>