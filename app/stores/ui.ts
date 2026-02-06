import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    menuOpen: false
  }),

  getters: {
    isMenuOpen: (state) => state.menuOpen
  },

  actions: {
    toggleMenu(force?: boolean) {
      this.menuOpen = force === undefined ? !this.menuOpen : force;
    }
  }
})