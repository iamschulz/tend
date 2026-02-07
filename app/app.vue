<template>
  <main-header />
  <main-menu />
  <main>
    <tracker-today />
    <NuxtRouteAnnouncer />
    <TriggerGroup />
  </main>
  <main-footer />
</template>

<style>
:root {
    --font: 'Quicksand';
    --font-accent: 'Quicksand';
    --col-fg: #222;
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