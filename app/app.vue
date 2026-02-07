<template>
  <main-header />
  <main-menu v-if="mounted" />
  <main>
    <tracker-today v-if="mounted" />
    <NuxtRouteAnnouncer />
    <TriggerGroup v-if="mounted" />
  </main>
  <main-footer />
</template>

<script setup lang="ts">
  const mounted = ref(false)

  onMounted(() => {
    mounted.value = true
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