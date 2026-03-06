<template>
    <div data-loading>
        <span class="sr-only">{{ $t('loading') }}</span>
    </div>
</template>

<style scoped>
    [data-loading] {
        font-size: 2em;
        display: grid;
        place-items: center;
        margin-block: 3rem;
    }
</style>