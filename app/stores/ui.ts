import { defineStore } from 'pinia'
import type { Entry } from '~/types/Entry'

let confirmResolver: ((value: boolean) => void) | null = null

export const useUiStore = defineStore('ui', {
  /** @returns Initial UI state */
  state: () => ({
    currentViewDate: new Date(),
    skipListFadeIn: false,
    pendingEntry: null as { entry: Entry, closeCategoryId: string } | null,

    // modals
    menuOpen: false,
    confirmOpen: false,
    confirmMessage: '',
    errorOpen: false,
    errorMessage: '',
    triggerDialogOpen: false,
    changePasswordOpen: false,
    adminResetPasswordOpen: false,
  }),

  getters: {
    /** @param state - Store state */
    getCurrentViewDate: (state) => state.currentViewDate,

    // modals
    /** @param state - Store state */
    menu: (state) => state.menuOpen,
    /** @param state - Store state */
    confirm: (state) => state.confirmOpen,
    /** @param state - Store state */
    error: (state) => state.errorOpen,
    /** @param state - Store state */
    triggerDialog: (state) => state.triggerDialogOpen,
    /** @param state - Store state */
    changePassword: (state) => state.changePasswordOpen,
    /** @param state - Store state */
    adminResetPassword: (state) => state.adminResetPasswordOpen,
  },

  actions: {
    /** @param date - The date to set as the current view date */
    setCurrentViewDate(date: Date) {
      this.currentViewDate = date;
    },

    // modals
    /** @param force - Optional value to force the menu open or closed */
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    },

    /** @param force - Optional value to force the confirm dialog open or closed */
    toggleConfirm(force?: boolean) {
      const open = force === undefined ? !this.confirmOpen : force;
      this.confirmOpen = open;
      if (!open) this.resolveConfirm(false);
    },

    /** @param force - Optional value to force the trigger dialog open or closed */
    toggleTriggerDialog(force?: boolean) {
      this.triggerDialogOpen = force === undefined ? !this.triggerDialogOpen : force;
    },

    /** @param force - Optional value to force the change password dialog open or closed */
    toggleChangePassword(force?: boolean) {
      this.changePasswordOpen = force === undefined ? !this.changePasswordOpen : force;
    },

    /** @param force - Optional value to force the admin reset password dialog open or closed */
    toggleAdminResetPassword(force?: boolean) {
      this.adminResetPasswordOpen = force === undefined ? !this.adminResetPasswordOpen : force;
    },

    /** @param force - Optional value to force the error dialog open or closed */
    toggleError(force?: boolean) {
      this.errorOpen = force === undefined ? !this.errorOpen : force;
    },

    /** @param message - The error message to display */
    showError(message: string) {
      this.errorMessage = message;
      this.errorOpen = true;
    },

    /** @param message - The confirmation message to display */
    requestConfirm(message: string): Promise<boolean> {
      this.confirmMessage = message;
      this.confirmOpen = true;
      return new Promise<boolean>((resolve) => {
        confirmResolver = resolve;
      });
    },

    /** @param value - Whether the user confirmed */
    resolveConfirm(value: boolean) {
      if (confirmResolver) {
        confirmResolver(value);
        confirmResolver = null;
      }
      this.confirmOpen = false;
    },
  }
})