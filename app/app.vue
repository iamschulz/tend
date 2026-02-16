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
  body {
    margin: 0;
  }

  #__nuxt {
    overflow-x: initial;
  }
</style>