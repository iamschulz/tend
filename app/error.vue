<template>
    <main>
        <ErrorNotice>
            {{ error?.statusCode === 404 ? $t('pageNotFoundMessage') : $t('somethingWrong') }}
            <div class="error-action">
                <NuxtLink href="/" @click="() => clearError()">{{ $t('goBack') }}</NuxtLink>
            </div>
        </ErrorNotice>
    </main>
</template>

<script setup lang="ts">
    import type { NuxtError } from '#app'

    defineProps<{
        error: NuxtError
    }>()
</script>

<style scoped>
    .error-action {
        max-width: var(--narrow-width);
        margin: 0 auto;
        text-align: center;
    }
</style>
