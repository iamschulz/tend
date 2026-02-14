<template>
    <DialogWrapper name="confirm" :title="ui.confirmMessage" class="confirm-dialog">
        <div class="confirm-actions">
            <button @click="ui.resolveConfirm(false)">Cancel</button>
            <button data-variant="primary" @click="ui.resolveConfirm(true)">Confirm</button>
        </div>
    </DialogWrapper>
</template>

<script setup lang="ts">
    const ui = useUiStore();
</script>

<style scoped>
    .confirm-dialog[open] {
        height: fit-content;
        width: unset;
        max-width: min(90vw, 24rem);
        min-height: 0;
    }

    .confirm-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-block: 1rem;
    }
</style>
