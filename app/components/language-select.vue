<script setup>
const { locale, locales, setLocale } = useI18n()
</script>

<template>
  <div>
    <label for="language-select">{{ $t("language") }}: </label>
    <select id="language-select" :value="locale" @change="setLocale(($event.target).value)">
      <option v-for="loc in locales" :key="loc.code" :value="loc.code">
        {{ loc.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
  div {
    margin-block: 1rem;
  }
</style>