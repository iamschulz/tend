<template>
    <DialogWrapper name="confirm" :title="ui.confirmMessage" class="confirm-dialog" data-shadow="5">
        <div class="confirm-actions">
            <button @click="ui.resolveConfirm(false)"><nuxt-icon name="close" />{{ $t('cancel') }}</button>
            <button data-variant="primary" @click="ui.resolveConfirm(true)"><nuxt-icon name="check" />{{ $t('confirm') }}</button>
        </div>
    </DialogWrapper>
</template>

<script setup lang="ts">
    const ui = useUiStore();
</script>

<style scoped>
    .confirm-dialog[open] {
        max-width: min(90vw, 24rem);
    }

    .confirm-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-block: 1rem;
    }

    button {
        display: flex;
        gap: 0.5ch;
    }
</style>
