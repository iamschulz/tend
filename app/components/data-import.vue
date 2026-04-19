<template>
    <button @click="fileInput?.click()">{{ $t('import') }}</button>
    <input ref="fileInput" type="file" accept=".json" class="sr-only" @change="handleFileSelect">
</template>

<script setup lang="ts">
    import { ref } from 'vue'
    import { useDataStore } from '~/stores/data'
    import { validateImportData } from '~/util/validateImportData'

    const fileInput = ref<HTMLInputElement | null>(null)
    const data = useDataStore()
    const ui = useUiStore()
    const { t } = useI18n()
    const { announce } = useAnnounce()

    /** Handles file input change: validates and imports the selected JSON file. */
    async function handleFileSelect() {
        const file = fileInput.value?.files?.[0]
        if (!file) { return }

        try {
            const text = await file.text()
            const parsed: unknown = JSON.parse(text)

            if (!validateImportData(parsed)) {
                ui.showError(t('importError'))
                return
            }

            if (!await ui.requestConfirm(t('importConfirm'))) {
                return
            }

            data.importData(parsed.categories, parsed.days ?? [])
            announce(t('imported'))
        } catch {
            ui.showError(t('importError'))
        } finally {
            if (fileInput.value) {
                fileInput.value.value = ''
            }
        }
    }
</script>
