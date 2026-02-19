<template>
    <button @click="handleExport">{{ $t('export') }}</button>
</template>

<script setup lang="ts">
    import { downloadExportData } from '~/util/exportData'

    const data = useDataStore()

    function handleExport() {
        downloadExportData(data.categories, data.entries)
    }
</script>
