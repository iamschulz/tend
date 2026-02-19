import { defineStore } from 'pinia'

let confirmResolver: ((value: boolean) => void) | null = null

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentViewDate: new Date(),

    // modals
    menuOpen: false,
    confirmOpen: false,
    confirmMessage: '',
    errorOpen: false,
    errorMessage: '',
    triggerDialogOpen: false,
  }),

  getters: {
    getCurrentViewDate: (state) => state.currentViewDate,

    // modals
    menu: (state) => state.menuOpen,
    confirm: (state) => state.confirmOpen,
    error: (state) => state.errorOpen,
    triggerDialog: (state) => state.triggerDialogOpen,
  },

  actions: {
    setCurrentViewDate(date: Date) {
      this.currentViewDate = date;
    },

    // modals
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    },

    toggleConfirm(force?: boolean) {
      const open = force === undefined ? !this.confirmOpen : force;
      this.confirmOpen = open;
      if (!open) this.resolveConfirm(false);
    },

    toggleTriggerDialog(force?: boolean) {
      this.triggerDialogOpen = force === undefined ? !this.triggerDialogOpen : force;
    },

    toggleError(force?: boolean) {
      this.errorOpen = force === undefined ? !this.errorOpen : force;
    },

    showError(message: string) {
      this.errorMessage = message;
      this.errorOpen = true;
    },

    requestConfirm(message: string): Promise<boolean> {
      this.confirmMessage = message;
      this.confirmOpen = true;
      return new Promise<boolean>((resolve) => {
        confirmResolver = resolve;
      });
    },

    resolveConfirm(value: boolean) {
      if (confirmResolver) {
        confirmResolver(value);
        confirmResolver = null;
      }
      this.confirmOpen = false;
    },
  }
})