<template>
  <main-header />
  <main-menu v-if="ready" />
  <confirm-dialog v-if="ready" />
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
:root {
    --font: 'Quicksand';
    --font-accent: 'Quicksand';
    --col-fg: #222;
    --animation-duration: 0.3s;
}

@media (prefers-color-scheme: dark) {
    :root {
        --col-fg: #ddd;
    }
}

body {
  margin: 0;
}

#__nuxt {
  overflow-x: initial;
}
</style>