<template>
    <DialogWrapper :name="name" :title="title">
        <form class="change-password-form" @submit.prevent="submit">
            <label v-if="!userId">
                {{ $t('password.current') }}:
                <input
                    v-model="currentPassword"
                    type="password"
                    autocomplete="current-password"
                    required
                    minlength="1"
                >
            </label>
            <label>
                {{ $t('password.new') }}:
                <input
                    v-model="newPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                    minlength="8"
                >
            </label>
            <label>
                {{ $t('password.confirmNew') }}:
                <input
                    v-model="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                    minlength="8"
                >
            </label>
            <button type="submit" data-button data-variant="primary">
                {{ userId ? $t('password.reset') : $t('password.change') }}
            </button>
        </form>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="success" class="success" role="status">{{ success }}</p>
    </DialogWrapper>
</template>

<script lang="ts" setup>
    import type { StoreGetters } from 'pinia'

    const ui = useUiStore()
    type GetterKey = keyof StoreGetters<typeof ui>

    /**
     * @prop name - UI store getter key that controls dialog open/close state
     * @prop userId - Target user ID for admin resets. Omit for self-service mode.
     * @prop userName - Display name of the target user (admin mode only)
     */
    const props = defineProps<{
        name: GetterKey
        userId?: string
        userName?: string
    }>()

    const emit = defineEmits<{
        success: []
    }>()

    const { $i18n } = useNuxtApp()

    const currentPassword = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const error = ref('')
    const success = ref('')

    const title = computed(() =>
        props.userId
            ? $i18n.t('password.resetConfirm', { name: props.userName ?? '' })
            : $i18n.t('password.change')
    )

    /** Clears all form fields and messages. */
    function resetForm() {
        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        error.value = ''
        success.value = ''
    }

    watch(() => ui[props.name], (open) => {
        if (open) resetForm()
    })

    /**
     * Validates inputs and submits the password change.
     * Routes to the self-service or admin endpoint based on whether userId is set.
     */
    async function submit() {
        error.value = ''
        success.value = ''

        if (newPassword.value !== confirmPassword.value) {
            error.value = $i18n.t('password.mismatch')
            return
        }

        const confirmMessage = props.userId
            ? $i18n.t('password.resetConfirm', { name: props.userName ?? '' })
            : $i18n.t('password.changeConfirm')

        if (!await ui.requestConfirm(confirmMessage)) return

        try {
            if (props.userId) {
                await $fetch(`/api/admin/users/${encodeURIComponent(props.userId)}`, {
                    method: 'PUT',
                    body: { password: newPassword.value },
                })
                success.value = $i18n.t('password.resetDone')
            } else {
                await $fetch('/api/auth/change-password', {
                    method: 'POST',
                    body: {
                        currentPassword: currentPassword.value,
                        newPassword: newPassword.value,
                    },
                })
                success.value = $i18n.t('password.changed')
            }

            currentPassword.value = ''
            newPassword.value = ''
            confirmPassword.value = ''
            emit('success')
        }
        catch (e: unknown) {
            error.value = (e as { data?: { message?: string } }).data?.message ?? $i18n.t('error')
        }
    }
</script>

<style>
    .change-password-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;

        label {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        input {
            width: 100%;
        }
    }

    .change-password-form + .error {
        color: var(--col-danger, red);
        padding-inline: 1rem;
    }

    .change-password-form + .success,
    .change-password-form ~ .success {
        color: var(--col-accent);
        padding-inline: 1rem;
    }
</style>
