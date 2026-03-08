<template>
    <div data-loading>
        <ClientOnly><span class="sr-only">{{ $t('loading') }}</span></ClientOnly>
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