<template>
    <article class="privacy">
        <section>
            <h2>{{ $t('privacy1.title') }}</h2>
            <i18n-t keypath="privacy1.body" tag="p">
                <template #netlifyLink>
                    <a href="https://netlify.com" target="_blank">Netlify</a>
                </template>
            </i18n-t>
        </section>

        <section>
            <h2>{{ $t('privacy2.title') }}</h2>
            <i18n-t keypath="privacy2.body" tag="p">
                <template #netlifyLink>
                    <a href="https://netlify.com" target="_blank">Netlify</a>
                </template>
            </i18n-t>
        </section>
    </article>
</template>

<style scoped>
    .privacy {
        max-width: 40rem;
        margin: 2rem auto;
        padding: 0 1rem;
    }
</style>
