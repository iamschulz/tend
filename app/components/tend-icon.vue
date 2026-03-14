<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span class="nuxt-icon" v-html="svg" />
</template>

<script setup lang="ts">
    import rawSvg from '~/assets/icons/tend.svg?raw'

    const uid = Math.random().toString(36).slice(2, 8)
    const svg = rawSvg
        .replace(/\bid="([^"]+)"/g, (_, id) => `id="${id}-${uid}"`)
        .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${uid})`)
</script>
