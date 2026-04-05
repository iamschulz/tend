<template>
    <div class="admin-page">
        <section>
            <h2>{{ $t('admin.users') }}</h2>
            <ul class="nolist user-list" data-autogrid="1/3">
                <li v-for="user in userList" :key="user.id" class="user-item" >
                    <article data-card data-shadow="1">
                        <header class="user-info">
                            <span>
                                <UserAvatar :name="user.name" />&nbsp;
                                <strong>{{ user.name }}</strong>
                            </span>
                            <button
                                v-if="user.id !== session.user?.id"
                                @click="deleteUser(user)"
                            >
                                <nuxt-icon name="delete" />
                                <span class="sr-only">{{ $t('delete') }}</span>
                            </button>
                        </header>

                        <span class="user-email">{{ $t("login.email") }}: {{ user.email }}</span><br>
                        <label class="user-role">
                            {{ $t("admin.role") }}:
                            <select
                                :value="user.role"
                                :disabled="user.id === session.user?.id"
                                @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
                            >
                                <option value="user">{{ $t('admin.user') }}</option>
                                <option value="admin">{{ $t('admin.admin') }}</option>
                            </select>
                        </label>
                    </article>
                </li>
            </ul>
        </section>

        <h2>{{ $t('admin.invites') }}</h2>
        <section data-card data-shadow="1">
            <form class="invite-form" @submit.prevent="addInvite" data-group>
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
    </div>
</template>

<script setup lang="ts">
import UserAvatar from '~/components/user-avatar.vue';

const { $i18n } = useNuxtApp()
const { session } = useUserSession()
const ui = useUiStore()

const error = ref('')
const inviteEmail = ref('')

interface UserItem { id: string; email: string; name: string; role: string; createdAt: number; lastLoginAt: number | null }
interface InviteItem { id: string; email: string; createdAt: number }

const { data: userList, refresh: refreshUsers } = await useFetch<UserItem[]>('/api/admin/users')
const { data: inviteList, refresh: refreshInvites } = await useFetch<InviteItem[]>('/api/admin/invites')

/**
 * Changes a user's role.
 * @param user - The user to update
 * @param role - The new role
 */
async function changeRole(user: UserItem, role: string) {
    error.value = ''
    try {
        await $fetch(`/api/admin/users/${user.id}`, {
            method: 'PUT',
            body: { role },
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
    if (!await ui.requestConfirm($i18n.t('admin.deleteConfirm', { name: user.name }))) return
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
    .user-item,
    .invite-item {
        [data-card] {
            width: 100%;
        }
    }

    .user-info {
        display: flex;
        justify-content: space-between;
        
        button {
            margin-left: auto;
        }   
    }

    .user-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1ch;
    }

    .invite-form input {
        flex: 1;
    }
</style>
