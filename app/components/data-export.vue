<template>
    <button @click="handleExport">{{ $t('export') }}</button>
</template>

<script setup lang="ts">
    import { downloadExportData } from '~/util/exportData'

    const data = useDataStore()
    const { t } = useI18n()
    const { announce } = useAnnounce()

    function handleExport() {
        downloadExportData(data.categories, data.entries)
        announce(t('exported'))
    }
</script>
