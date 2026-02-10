// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  modules: [
    '@nuxt/a11y',
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/test-utils',
    '@nuxt/fonts',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-icons',
  ],

  css: [
    'ssstyles/css/base.css',
    'ssstyles/css/themes/business.css', 
    'ssstyles/css/transition.css', 
    'ssstyles/css/basegrid.css', 
    'ssstyles/css/headline.css', 
    'ssstyles/css/actionlink.css', 
    'ssstyles/css/group.css', 
    'ssstyles/css/carousel.css', 
    'ssstyles/css/card.css', 
    'ssstyles/css/avatar.css', 
    'ssstyles/css/animation.css', 
    'ssstyles/css/shadow.css', 
    '~/assets/css/fixes.css',
    '~/assets/css/theme.css',
    '~/assets/css/srOnly.css',
    '~/assets/css/nolist.css',
    '~/assets/css/nobutton.css',
  ]
})