<template>
    <div class="admin-page">
        <h1>{{ $t('admin.title') }}</h1>

        <section>
            <h2>{{ $t('admin.users') }}</h2>
            <ul class="nolist user-list">
                <li v-for="user in userList" :key="user.id" class="user-item">
                    <div class="user-info">
                        <strong>{{ user.name }}</strong>
                        <span class="user-email">{{ user.email }}</span>
                        <span class="user-role" :data-role="user.role">{{ user.role }}</span>
                    </div>
                    <div class="user-actions" data-group>
                        <button
                            v-if="user.id !== session.user?.id"
                            data-button
                            @click="toggleRole(user)"
                        >
                            {{ user.role === 'admin' ? $t('admin.demote') : $t('admin.promote') }}
                        </button>
                        <button
                            v-if="user.id !== session.user?.id"
                            data-button
                            class="danger"
                            @click="deleteUser(user)"
                        >
                            {{ $t('delete') }}
                        </button>
                    </div>
                </li>
            </ul>
        </section>

        <section>
            <h2>{{ $t('admin.invites') }}</h2>
            <form class="invite-form" @submit.prevent="addInvite">
                <input
                    v-model="inviteEmail"
                    type="email"
                    :placeholder="$t('admin.invitePlaceholder')"
                    required
                >
                <button type="submit" data-button :disabled="!inviteEmail">
                    {{ $t('admin.invite') }}
                </button>
            </form>
            <ul class="nolist invite-list">
                <li v-for="invite in inviteList" :key="invite.id" class="invite-item">
                    <span>{{ invite.email }}</span>
                    <button data-button class="danger" @click="removeInvite(invite)">
                        {{ $t('delete') }}
                    </button>
                </li>
            </ul>
            <p v-if="inviteList?.length === 0" class="empty">{{ $t('admin.noInvites') }}</p>
        </section>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <NuxtLink to="/" class="back-link">{{ $t('goBack') }}</NuxtLink>
    </div>
</template>

<script setup lang="ts">
const { $i18n } = useNuxtApp()
const { session } = useUserSession()

const error = ref('')
const inviteEmail = ref('')

interface UserItem { id: string; email: string; name: string; role: string; createdAt: number; lastLoginAt: number | null }
interface InviteItem { id: string; email: string; createdAt: number }

const { data: userList, refresh: refreshUsers } = await useFetch<UserItem[]>('/api/admin/users')
const { data: inviteList, refresh: refreshInvites } = await useFetch<InviteItem[]>('/api/admin/invites')

/**
 * Toggles a user's role between admin and user.
 * @param user - The user to update
 */
async function toggleRole(user: UserItem) {
    error.value = ''
    try {
        await $fetch(`/api/admin/users/${user.id}`, {
            method: 'PUT',
            body: { role: user.role === 'admin' ? 'user' : 'admin' },
        })
        await refreshUsers()
    }
    catch (e: unknown) {
        error.value = (e as { data?: { message?: string } }).data?.message ?? $i18n.t('error')
    }
}

/**
 * Deletes a user after confirmation.
 * @param user - The user to delete
 */
async function deleteUser(user: UserItem) {
    error.value = ''
    if (!confirm($i18n.t('admin.deleteConfirm', { name: user.name }))) return
    try {
        await $fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
        await refreshUsers()
    }
    catch (e: unknown) {
        error.value = (e as { data?: { message?: string } }).data?.message ?? $i18n.t('error')
    }
}

/** Adds an email to the allowlist. */
async function addInvite() {
    error.value = ''
    try {
        await $fetch('/api/admin/invites', {
            method: 'POST',
            body: { email: inviteEmail.value },
        })
        inviteEmail.value = ''
        await refreshInvites()
    }
    catch (e: unknown) {
        error.value = (e as { data?: { message?: string } }).data?.message ?? $i18n.t('error')
    }
}

/**
 * Removes an email from the allowlist.
 * @param invite - The invite to remove
 */
async function removeInvite(invite: InviteItem) {
    error.value = ''
    try {
        await $fetch(`/api/admin/invites/${invite.id}`, { method: 'DELETE' })
        await refreshInvites()
    }
    catch (e: unknown) {
        error.value = (e as { data?: { message?: string } }).data?.message ?? $i18n.t('error')
    }
}
</script>

<style scoped>
.admin-page {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1rem;
}

h1 {
    font-family: var(--font-accent);
}

section {
    margin-block: 2rem;
}

.user-item,
.invite-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--col-bg3);
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.user-email {
    font-size: 0.875rem;
    color: var(--col-fg2);
}

.user-role {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.user-role[data-role="admin"] {
    color: var(--col-accent);
}

.invite-form {
    display: flex;
    gap: 0.5rem;
}

.invite-form input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--col-fg2);
    border-radius: var(--border-radius);
    background: var(--col-bg3);
    color: var(--col-fg);
    font-family: var(--font);
    font-size: 1rem;
}

.danger {
    color: var(--col-accent2);
}

.empty {
    color: var(--col-fg2);
    font-size: 0.875rem;
}

.error {
    color: var(--col-accent2);
    font-size: 0.875rem;
}

.back-link {
    display: inline-block;
    margin-top: 1rem;
}
</style>
