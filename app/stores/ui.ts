import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    currentViewDate: new Date(),

    // modals
    menuOpen: false,
    timeSelectOpen: false,
  }),

  getters: {
    getCurrentViewDate: (state) => state.currentViewDate,

    // modals
    menu: (state) => state.menuOpen,
    timeSelect: (state) => state.timeSelectOpen
  },

  actions: {
    setCurrentViewDate(date: Date) {
      this.currentViewDate = date;
    },

    // modals
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    },
    toggleTimeSelect(force?: boolean) {
      this.timeSelectOpen = force === undefined ? !this.timeSelect : force;
    }
  }
})