import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentViewDate: new Date(),

    // modals
    menuOpen: false,
  }),

  getters: {
    getCurrentViewDate: (state) => state.currentViewDate,

    // modals
    menu: (state) => state.menuOpen,
  },

  actions: {
    setCurrentViewDate(date: Date) {
      this.currentViewDate = date;
    },

    // modals
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    },
  }
})