<template>
    <section data-dashedbox>
        <header><h3>{{ $t('error') }}</h3></header>
        <slot>{{ $t("somethingWrong") }}</slot>
    </section>
</template>

<style scoped>
    section {
        max-width: var(--narrow-width);
        margin: 1rem auto;

        h3 {
            margin-block: 0;
        }
    }
</style>