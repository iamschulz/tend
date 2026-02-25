<template>
    <button :hidden="!canInstall" class="installButton"  @click="onClick">{{ $t('installApp') }}</button>
</template>

<script setup lang="ts">
    const canInstall = ref(false);
    const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);

    const onClick = () => {
        deferredPrompt.value?.prompt();
    }

    window.addEventListener("beforeinstallprompt", (e: Event) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt.value = e as BeforeInstallPromptEvent;
        // Update UI notify the user they can install the PWA
        canInstall.value = true;
    });

    window.addEventListener("appinstalled", () => {
        canInstall.value = false;
        deferredPrompt.value = null;
    });
</script>

<style scoped>
    .installButton {
        max-width: 20ch;
        margin-inline: auto;
        margin-block: 3rem;

        &[hidden] {
            display: none;
        }
    }
</style>