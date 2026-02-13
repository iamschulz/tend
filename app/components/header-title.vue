<template>
    <h1 class="title">
        <span id="header-title-long" />
        <span id="header-title-short" />
        <span class="fallback">Tend</span>
    </h1>
</template>

<script setup lang="ts">
</script>

<style scoped>
    .title {
        margin: 0;
        font-size: 2rem;
    }

    /* Responsive long/short toggle */
    #header-title-short {
        display: inline;
    }

    #header-title-long {
        display: none;
    }

    .title:has(#header-title-long:not(:empty)) .fallback,
    .title:has(#header-title-short:not(:empty)) .fallback {
        display: none;
    }

    @media (min-width: 38rem) {
        #header-title-short {
            display: none;
        }

        #header-title-long {
            display: inline;
        }
    }
</style>
