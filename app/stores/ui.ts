import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    menuOpen: false,
    timeSelect: false,
  }),

  getters: {
    menu: (state) => state.menuOpen,
    timeSelect: (state) => state.timeSelect
  },

  actions: {
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    },
    toggleTimeSelect(force?: boolean) {
      this.timeSelect = force === undefined ? !this.timeSelect : force;
    }
  }
})