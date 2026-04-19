<template>
    <button @click="handleExport">{{ $t('export') }}</button>
</template>

<script setup lang="ts">
    import { downloadExportData, downloadExportPayload } from '~/util/exportData'

    const data = useDataStore()
    const ui = useUiStore()
    const { t } = useI18n()
    const { announce } = useAnnounce()

    /**
     * In server mode, fetch the authoritative snapshot from the API so day notes
     * that haven't been opened locally are still included. In local mode, the
     * in-memory store is the full source of truth.
     */
    async function handleExport() {
        if (data.isServerMode) {
            try {
                const payload = await $fetch('/api/data/export')
                downloadExportPayload(payload)
            } catch {
                ui.showError(t('exportError'))
                return
            }
        } else {
            downloadExportData(data.categories, data.entries, Object.values(data.days))
        }
        announce(t('exported'))
    }
</script>
