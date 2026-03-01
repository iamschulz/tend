<template>
    <DialogWrapper name="error" :title="ui.errorMessage" class="error-dialog" data-shadow="5">
        <div class="error-actions">
            <button data-variant="primary" @click="ui.toggleError(false)">{{ $t('close') }}</button>
        </div>
    </DialogWrapper>
</template>

<script setup lang="ts">
    const ui = useUiStore();
</script>

<style scoped>
    .error-dialog[open] {
        height: fit-content;
        width: unset;
        max-width: min(90vw, 24rem);
        min-height: 0;
    }

    .error-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-block: 1rem;
    }
</style>
